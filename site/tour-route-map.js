/* Public-address geocoding + real, mode-specific street/path routing. */
(() => {
  'use strict';
  const base=new URL('.',document.currentScript.src),model=window.TourRoutingModel;
  const profiles={walking:'foot',driving:'car',bicycling:'bike'};
  const modes={walking:'walk',driving:'drive',bicycling:'cycle'};
  const canonical=s=>s.trim().toLowerCase().replace(/\s+/g,' ');
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const geocodes=new Map(),routeCache=new Map();
  const seed=fetch(new URL('tour-geocodes.json?v=20261016',base)).then(r=>r.ok?r.json():null).then(data=>{
    for(const p of data?.locations||[])if(model.coordinate(p.coordinates))geocodes.set(canonical(p.address),p);
  }).catch(()=>{});
  let lastRequest=0,queue=Promise.resolve();
  // Each browser serializes requests, avoids background polling and reuses in-memory results.
  function queued(fn,signal){
    const request=queue.catch(()=>{}).then(async()=>{
      await new Promise(resolve=>setTimeout(resolve,Math.max(0,1100-(Date.now()-lastRequest))));
      signal.throwIfAborted();lastRequest=Date.now();return fn();
    });queue=request;return request;
  }
  // Census documents JSONP for browser clients. Isolate remote script from app data.
  function census(address,signal){return new Promise((resolve,reject)=>{
    const nonce=crypto.randomUUID(),frame=document.createElement('iframe');
    frame.hidden=true;frame.title='Address lookup';frame.setAttribute('sandbox','allow-scripts');
    const query=address.replace(/,?\s*(?:Suite|Ste\.?|#)\s*[A-Za-z0-9-]+/gi,'');
    const url=new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
    url.search=new URLSearchParams({address:query,benchmark:'Public_AR_Current',format:'jsonp',callback:'tourAddress'});
    let done=false;
    function finish(error,data){if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',message);signal.removeEventListener('abort',abort);frame.remove();error?reject(error):resolve(data);}
    function abort(){finish(new DOMException('Route changed','AbortError'));}
    function message(event){if(event.source===frame.contentWindow&&event.data?.nonce===nonce)finish(null,event.data.payload);}
    const timer=setTimeout(()=>finish(Error('Address lookup timed out. Retry, or open the addresses in Maps below.')),20000);
    window.addEventListener('message',message);signal.addEventListener('abort',abort,{once:true});
    const safeURL=url.href.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    frame.srcdoc=`<!doctype html><script>function tourAddress(payload){parent.postMessage({nonce:${JSON.stringify(nonce)},payload},'*')}<\/script><script src="${safeURL}"><\/script>`;
    document.body.append(frame);if(signal.aborted)abort();
  });}
  async function geocode(address,signal){
    await seed;signal.throwIfAborted();const key=canonical(address);
    if(geocodes.has(key))return geocodes.get(key);
    const data=await queued(()=>census(address,signal),signal),matches=model.readGeocodes(data);
    if(matches.length!==1)throw Error(matches.length?'This address has multiple matches. Add its ZIP code or correct the street address.':'This address could not be matched. Check the street number, city, state and ZIP.');
    const point={...matches[0],address};geocodes.set(key,point);return point;
  }
  async function route(points,mode,signal){
    const coords=points.map(p=>p.coordinates.map(n=>n.toFixed(6)).join(',')).join(';'),key=mode+'|'+coords;
    if(routeCache.has(key))return routeCache.get(key);
    const result=await queued(async()=>{
      const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),25000);
      const abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});
      try{
        const url='https://routing.openstreetmap.de/routed-'+profiles[mode]+'/route/v1/driving/'+coords+'?overview=full&geometries=geojson&steps=false&radiuses='+points.map(()=>100).join(';');
        const response=await fetch(url,{signal:timeout.signal,credentials:'omit'});
        if(!response.ok)throw Error('Routing is temporarily unavailable. Retry, or use directions below.');
        return model.readRoute(await response.json(),points.length);
      }catch(error){if(error.name==='AbortError'&&!signal.aborted)throw Error('Routing timed out. Please retry.');throw error;}
      finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
    },signal);
    routeCache.set(key,result);if(routeCache.size>30)routeCache.delete(routeCache.keys().next().value);return result;
  }
  function create({mount,presetButtons}){
    mount.className='ct-map-panel';
    mount.innerHTML=`<div class="ct-map-top"><div><p class="cp-tag">03 / Put your time on the map</p><h2>How far can you go?</h2></div><button type="button" class="btn ct-primary" id="ct-map-calculate">Map & time my route ↗</button></div>
      <p class="ct-map-privacy">This sends the selected public addresses to the US Census Bureau for matching and route coordinates to FOSSGIS. Your notes stay here.</p>
      <p id="ct-map-status" role="status">Add at least two stops to calculate a route.</p>
      <div id="ct-timed-result" class="ct-timed-result" hidden></div>
      <div id="ct-map-empty" class="ct-map-empty"><div aria-hidden="true"><b>1</b><i>·······</i><b>2</b><i>·······</i><b>3</b></div><p>Your streets. Your stops. Your time.</p><span>A street-by-street route will appear here.</span></div>
      <div id="ct-map-canvas" class="ct-map-canvas" role="region" aria-label="Tour route map with numbered stops. Use arrow keys to pan and plus or minus to zoom." hidden></div>
      <div id="ct-map-controls" class="ct-map-controls" hidden><button type="button" class="btn" id="ct-map-fit">Show whole route</button><span>Blue = walk · red = drive · numbers = stop order</span></div>
      <p id="ct-map-tiles" class="cp-small" hidden>Some map tiles did not load. The route and stop list are still available.</p>
      <ol id="ct-timed-legs" class="ct-timed-legs" aria-label="Route leg times and cumulative arrivals"></ol>
      <details class="ct-map-method"><summary>How times and locations are calculated</summary><p>Times come from <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS / OSRM</a> routes on OpenStreetMap roads and paths, using separate walking, driving and cycling profiles. They are estimates, not measured trips or live traffic. Your pace, crossings, roadworks and parking can add time. Time to reach stop 1 is not included.</p><p>Address pins use <a href="https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html" target="_blank" rel="noopener noreferrer">US Census address-range interpolation</a>, not verified entrances. Check the matched addresses below. A mapped route does not verify public access, sidewalks or accessibility. Use permitted public places.</p><p>Changing stops clears old estimates. Routes are calculated on request; a service failure leaves the time unknown. Notes are never sent to routing services.</p><div id="ct-matched-addresses"></div><a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Help fix the map ↗</a></details>`;
    const $=id=>mount.querySelector('#'+id),button=$('ct-map-calculate');
    let config={stops:[],mode:'walking',budget:10,dwell:0,roundTrip:false},key='',generation=0,controller,results={},errors={},points=[],busy=false,map,L,group,markers=[],bounds,lastDraw='';
    const setStatus=text=>$('ct-map-status').textContent=text;
    function clearDrawing(){if(group)group.clearLayers();markers=[];lastDraw='';$('ct-map-canvas').hidden=true;$('ct-map-controls').hidden=true;$('ct-map-empty').hidden=false;$('ct-map-tiles').hidden=true;}
    function update(next){
      const nextKey=model.routeKey(next.stops,next.roundTrip);config={...next};
      if(nextKey!==key){key=nextKey;generation++;controller?.abort();busy=false;results={};errors={};points=[];clearDrawing();$('ct-matched-addresses').replaceChildren();setStatus(next.stops.length<2?'Add at least two stops to calculate a route.':'Ready to map these stops. Calculate to see which time budgets fit.');}
      button.disabled=busy||next.stops.length<2;paint();
    }
    function paint(){
      const {stops,mode,budget,dwell,roundTrip}=config,r=results[mode],fit=model.assessTime(r,budget,dwell,stops.length);
      for(const b of presetButtons){let info=b.querySelector('.ct-preset-fit');if(!info){info=el('small','','ct-preset-fit');b.append(info);}
        const target=Number(b.dataset.preset),m=target===20?'driving':'walking',f=model.assessTime(results[m],target,dwell,stops.length);
        info.textContent=f?(f.fits?'✓ Fits':'Over')+' · '+Math.ceil(f.total/60)+' min est.':errors[m]?'Time unavailable':busy?'Calculating…':'Map to compare';
        b.dataset.fit=f?(f.fits?'yes':'no'):'unknown';
      }
      $('ct-timed-result').hidden=!fit;$('ct-timed-legs').replaceChildren();
      if(!fit){clearDrawing();if(!busy&&errors[mode])setStatus(errors[mode]);else if(!busy&&points.length&&!r)setStatus('Calculate this travel mode to see its route and time.');return;}
      const result=$('ct-timed-result');result.replaceChildren();result.dataset.fit=fit.fits?'yes':'no';
      const time=el('div',undefined,'ct-route-time');time.append(el('strong','≈ '+Math.ceil(fit.total/60)),el('span','min total · '+modes[mode]));
      const detail=el('div');detail.append(el('b',fit.fits?'Fits your '+budget+' min budget':'Over your '+budget+' min budget', 'ct-time-verdict'));
      detail.append(el('p',model.formatTime(r.duration)+' travel'+(fit.pause?' + '+model.formatTime(fit.pause)+' at stops':'')+' · '+(r.distance/1609.344).toFixed(2)+' mi'));
      detail.append(el('p',(roundTrip?'Returns to stop 1':'One-way · finishes at stop '+stops.length)+' · no live traffic','cp-small'));
      if(!fit.fits)detail.append(el('span','About '+Math.ceil(-fit.remaining/60)+' min over. Remove a stop, change order or choose a larger budget.','ct-over-note'));
      result.append(time,detail);
      stops.forEach((s,i)=>{
        const li=el('li'),jump=el('button',undefined,'ct-leg-stop');jump.type='button';jump.append(el('b',String(i+1)),el('span',s.name));jump.onclick=()=>{markers[i]?.openPopup();map?.panTo(points[i].coordinates.slice().reverse());};
        const timing=el('div',undefined,'ct-leg-time');timing.append(el('strong',i?model.formatTime(r.legs[i-1].duration)+' '+modes[mode]:'Start here'));
        timing.append(el('span',i?'Arrive at '+model.formatTime(fit.arrivals[i]):'Travel to this stop not included'));
        li.append(jump,timing);$('ct-timed-legs').append(li);
      });
      if(roundTrip){const li=el('li',undefined,'ct-return-leg');li.append(el('b','↩ Back to 1'),el('span',model.formatTime(r.legs.at(-1).duration)+' '+modes[mode]+' · finish at '+model.formatTime(fit.total)));$('ct-timed-legs').append(li);}
      draw(r).catch(()=>setStatus('Map could not load. The calculated times and directions below are still available.'));
    }
    async function draw(r){
      const signature=key+'|'+config.mode;if(lastDraw===signature)return;
      const expected=generation,mode=config.mode;
      $('ct-map-controls').querySelector('span').textContent=(mode==='walking'?'Dotted blue = walking route':mode==='driving'?'Red = driving route':'Blue = cycling route')+' · numbers = stop order';
      L=await window.NearbyMap.loadLibrary();if(expected!==generation||mode!==config.mode)return;
      $('ct-map-canvas').hidden=false;$('ct-map-controls').hidden=false;$('ct-map-empty').hidden=true;
      if(!map){map=L.map($('ct-map-canvas'),{scrollWheelZoom:false,zoomControl:false}).setView([39,-98],4);L.control.zoom({position:'topright'}).addTo(map);L.control.scale({position:'bottomleft'}).addTo(map);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,updateWhenIdle:true,keepBuffer:1,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://routing.openstreetmap.de/about.html">FOSSGIS routes</a>'}).on('tileerror',()=>{$('ct-map-tiles').hidden=false;}).addTo(map);
        group=L.featureGroup().addTo(map);new ResizeObserver(()=>{if(!$('ct-map-canvas').hidden)map.invalidateSize({animate:false});}).observe($('ct-map-canvas'));
        window.addEventListener('footprint:viewchange',()=>{if(document.body.dataset.view==='tours')requestAnimationFrame(()=>map.invalidateSize({animate:false}));});
      }
      group.clearLayers();markers=[];const color=mode==='driving'?'#ae382c':'#204ab1';
      L.geoJSON(r.geometry,{style:{color:'#fffdf5',weight:10,opacity:1}}).addTo(group);
      L.geoJSON(r.geometry,{style:{color,weight:5,opacity:1,dashArray:mode==='walking'?'2 7':null}}).addTo(group);
      config.stops.forEach((s,i)=>{
        const popup=el('div',undefined,'ct-tour-popup');popup.append(el('b',(i+1)+'. '+s.name),el('p',s.address),el('span',i?'From stop '+i+': '+model.formatTime(r.legs[i-1].duration)+' '+modes[mode]:'Start · time begins here'));
        popup.append(el('p','Phase: '+s.phase,'cp-small'));
        const marker=L.marker(points[i].coordinates.slice().reverse(),{icon:L.divIcon({className:'ct-number-pin',html:'<span class="ct-pin-color-'+(i%3)+'">'+String(i+1)+'</span>',iconSize:[44,44],iconAnchor:[22,22]}),title:'Stop '+(i+1)+': '+s.name,alt:'Stop '+(i+1)+': '+s.name,riseOnHover:true,keyboard:true}).addTo(group).bindPopup(popup,{maxWidth:240,autoPanPadding:[22,22]});markers.push(marker);
      });
      bounds=group.getBounds();map.invalidateSize({animate:false});map.fitBounds(bounds,{padding:[35,35],maxZoom:17,animate:false});lastDraw=signature;
    }
    button.onclick=async()=>{
      if(busy||config.stops.length<2)return;
      const job=++generation,snapshot={...config,stops:[...config.stops]};controller?.abort();controller=new AbortController();const signal=controller.signal;
      busy=true;button.disabled=true;errors={};paint();
      try{
        points=[];
        for(const [i,stop] of snapshot.stops.entries()){
          setStatus('Finding stop '+(i+1)+' of '+snapshot.stops.length+'…');
          try{points.push(await geocode(stop.address,signal));}catch(error){if(error.name==='AbortError')throw error;throw Error('Stop '+(i+1)+' — '+stop.address+': '+error.message);}
        }
        signal.throwIfAborted();$('ct-matched-addresses').replaceChildren(el('h3','Matched public addresses'));
        points.forEach((p,i)=>$('ct-matched-addresses').append(el('p',(i+1)+'. '+p.matchedAddress)));
        const routed=snapshot.roundTrip?[...points,points[0]]:points;
        for(const mode of [...new Set([snapshot.mode,'walking','driving'])]){
          setStatus('Calculating '+modes[mode]+' route…');
          try{const r=await route(routed,mode,signal);signal.throwIfAborted();if(job!==generation)return;results[mode]=r;}
          catch(error){if(signal.aborted)throw error;errors[mode]=modes[mode]+': '+(error.message||'Route unavailable. Please retry.');}
          paint();
        }
        setStatus(results[config.mode]?'Route checked '+new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})+'. Times are estimates; allow for conditions.':errors[config.mode]||'Calculate the selected mode to see its time.');
      }catch(error){if(job===generation&&!signal.aborted){errors[config.mode]=error.message||'Unable to calculate. Retry, or open directions below.';setStatus(errors[config.mode]);}}
      finally{if(job===generation){busy=false;button.disabled=config.stops.length<2;paint();}}
    };
    $('ct-map-fit').onclick=()=>{if(bounds)map.fitBounds(bounds,{padding:[35,35],maxZoom:17,animate:false});};
    return {update};
  }
  window.TourRouteMap={create};
})();
