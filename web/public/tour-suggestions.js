/* Explicit ZIP search: shortlist public addresses, compare road/path times, verify each tour. */
(() => {
  'use strict';
  const model=window.TourSuggestionModel,routing=window.TourRoutingService,timing=window.TourRoutingModel;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  let catalogPromise;const zipCache=new Map();
  async function catalog(){
    if(!catalogPromise)catalogPromise=Promise.all(['nearby-locations.geojson','community-tour-stops.json','tour-geocodes.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('The public address catalog could not load. Please retry.');return r.json();}))).then(async([data,examples,geocodes])=>{
      const layer=await window.FacilityAddresses.enrich(data.features);if(!layer.available)throw Error('The address supplement could not load. Please retry.');
      const primary=(examples.stops||[]).filter(s=>!/office|contact|suite not verified/i.test(s.verification+' '+s.phase)).flatMap(s=>{
        const point=geocodes.locations.find(p=>p.address===s.address);return point?[{...s,priority:0,location:{coordinates:point.coordinates,source:point.source,label:'US Census address-range match'}}]:[];
      });
      const mapped=layer.features.filter(f=>f.properties.address&&f.properties.address.verification!=='operator-contact').map(f=>{
        const a=f.properties.address;return {name:window.FacilityAddresses.name(f),address:[a.street,a.city,[a.state,a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', '),source:a.source_url,checked:a.checked_on,verification:a.verification==='operator-facility'?'Operator facility listing':'Community-mapped address · confirm before travel',phase:'Existing in mapped source; current operation not independently verified',location:{coordinates:f.geometry.coordinates,source:'https://doi.org/10.57931/3017294',label:'IM3 / OpenStreetMap representative point'}};
      });
      return {stops:[...primary,...mapped],updated:layer.retrieved};
    }).catch(error=>{catalogPromise=null;throw error;});
    return catalogPromise;
  }
  async function lookupZip(zip,signal){
    if(zipCache.has(zip))return zipCache.get(zip);
    const timeout=new AbortController(),timer=setTimeout(()=>timeout.abort(),12000),abort=()=>timeout.abort();signal.addEventListener('abort',abort,{once:true});
    try{
      const options={signal:timeout.signal,credentials:'omit',referrerPolicy:'no-referrer'};
      let response=await fetch('https://api.zippopotam.us/us/'+zip,options);
      if(response.status===404&&/^00[679]/.test(zip))response=await fetch('https://api.zippopotam.us/pr/'+zip,options);
      if(response.status===404)throw Error('ZIP not found. Check all five digits, including any leading zero.');
      if(!response.ok)throw Error('ZIP lookup is unavailable. Please try again.');
      const data=await response.json(),p=data.places?.[0],coordinates=[Number(p?.longitude),Number(p?.latitude)];
      if(!p||!timing.coordinate(coordinates))throw Error('This ZIP lookup returned no usable location.');
      const place={coordinates,name:p['place name']+', '+(data['country abbreviation']==='PR'?'PR':p['state abbreviation'])};zipCache.set(zip,place);return place;
    }catch(error){if(error.name==='AbortError'&&!signal.aborted)throw Error('ZIP lookup timed out. Try again.');throw error;}
    finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  function create({mount,onUse}){
    mount.className='ct-auto';
    mount.innerHTML=`<div class="ct-auto-heading"><p class="cp-tag">Your ZIP. A little curiosity.</p><h2>Find a tour that fits.</h2><p>Nearby stops, travel time, and a moment to look.</p></div>
      <form id="ct-auto-form"><div class="ct-auto-inputs"><label>ZIP code<input id="ct-auto-zip" type="text" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" placeholder="87102" required aria-describedby="ct-auto-start"></label><label>Minutes to look at each stop<input id="ct-auto-dwell" type="number" inputmode="decimal" min="0.5" max="15" step="0.5" value="2" required></label></div>
      <div class="ct-auto-options"><label>Search within<select id="ct-auto-radius"><option value="2">2 miles of ZIP</option><option value="5">5 miles of ZIP</option><option value="10" selected>10 miles of ZIP</option><option value="25">25 miles of ZIP</option></select></label><label class="ct-round-trip"><input id="ct-auto-return" type="checkbox"> Return to the first stop</label></div>
      <p id="ct-auto-start" class="ct-auto-start"><b>Start at the first listed stop.</b> The ZIP finds your area—not your front door. Getting to the start is extra.</p><button class="btn ct-primary" id="ct-auto-submit" type="submit">Suggest nearby tours ↗</button><p class="cp-small">Search shares the ZIP with Zippopotam.us and public stop coordinates with FOSSGIS for route estimates. No device location is requested.</p></form>
      <p id="ct-auto-status" role="status">We’ll compare a 5-minute walk, 10-minute walk and 20-minute drive, including time at every stop.</p><div id="ct-auto-results" class="ct-auto-results"></div>
      <details class="ct-auto-method"><summary>Which stops are considered?</summary><p>We check up to eight of the nearest address-listed stops within your selected radius, combining co-located records. Each suggestion has two to six stops. The search favors more stops within budget, then a start nearer the ZIP reference point, then less travel. The full route is checked again before a suggestion is offered.</p><p>This is an incomplete public-address catalog, not a live list of all data centers or a guarantee of public access. Office/contact-only records are excluded when identified. Mapped points may not mark entrances. Phases and address sources travel with each selected stop. Road conditions, crossings and parking may add time.</p><p>Sources: <a href="https://api.zippopotam.us/" target="_blank" rel="noopener noreferrer">ZIP lookup</a> · <a href="https://doi.org/10.57931/3017294" target="_blank" rel="noopener noreferrer">PNNL / IM3 locations</a> · <a href="nearby-addresses.json">Address supplement</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noopener noreferrer">FOSSGIS routing</a> · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">Fix the map</a>.</p></details>`;
    const $=id=>mount.querySelector('#'+id);let generation=0,controller;
    const status=message=>$('ct-auto-status').textContent=message;
    function invalidate(){generation++;controller?.abort();$('ct-auto-submit').disabled=false;$('ct-auto-results').replaceChildren();status('Choose your settings, then suggest nearby tours.');}
    $('ct-auto-zip').oninput=()=>{const original=$('ct-auto-zip').value;$('ct-auto-zip').value=original.replace(/\D/g,'').slice(0,5);invalidate();if(original!==$('ct-auto-zip').value)status('Only numbers are kept. Enter all five ZIP digits.');};
    for(const id of ['ct-auto-dwell','ct-auto-radius','ct-auto-return'])$(id).addEventListener(id==='ct-auto-dwell'?'input':'change',invalidate);
    function emptyCard(preset,text,help='Try less time at stops, a wider search area or a custom route.'){const card=el('article',undefined,'ct-auto-card ct-auto-unavailable');card.append(el('p',preset.budget+' min '+preset.label,'cp-tag'),el('h3',text),el('p',help));return card;}
    function resultCard(preset,suggestion){
      const {stops,route,dwell,roundTrip,budget}=suggestion,fit=timing.assessTime(route,budget,dwell,stops.length),card=el('article',undefined,'ct-auto-card');
      card.append(el('p',budget+' min '+preset.label,'cp-tag'),el('strong','≈ '+Math.ceil(fit.total/60)+' min','ct-auto-total'),el('b',stops.length+' stops · fits with time to look','ct-auto-fit'));
      const bar=el('div',undefined,'ct-auto-timebar');bar.setAttribute('aria-hidden','true');const travel=el('i'),look=el('i');travel.style.width=(fit.travel/(budget*60)*100)+'%';look.style.width=(fit.pause/(budget*60)*100)+'%';bar.append(travel,look);card.append(bar);
      card.append(el('p',timing.formatTime(fit.travel)+' travel + '+timing.formatTime(fit.pause)+' looking','ct-auto-breakdown'));
      const list=el('ol');for(const s of stops){const item=el('li');item.append(el('b',s.name));list.append(item);}card.append(list);
      const start=el('p',undefined,'ct-auto-origin');start.append(el('b','Start: '+stops[0].address),el('span','≈ '+stops[0].distance.toFixed(1)+' mi from ZIP reference · getting here is extra'));
      card.append(start,el('p',roundTrip?'Returns to the first stop.':'One-way · ends at the last stop.','cp-small'));
      const use=el('button','Use '+budget+' min '+preset.label+' →','btn ct-primary');use.type='button';use.onclick=async()=>{use.disabled=true;try{await onUse(suggestion);}finally{use.disabled=false;}};
      card.append(use,el('p','Loads these stops into your tour below. Times are estimates, without live traffic.','cp-small'));return card;
    }
    $('ct-auto-form').onsubmit=async event=>{
      event.preventDefault();const zip=$('ct-auto-zip').value;if(!/^\d{5}$/.test(zip)){status('Enter a five-digit ZIP code.');return;}
      if(!$('ct-auto-dwell').validity.valid)return;
      invalidate();const job=generation,options={dwell:Number($('ct-auto-dwell').value),roundTrip:$('ct-auto-return').checked},radius=Number($('ct-auto-radius').value);controller=new AbortController();const signal=controller.signal;$('ct-auto-submit').disabled=true;status('Finding public addresses near '+zip+'…');
      const presets=[{budget:5,mode:'walking',label:'walk'},{budget:10,mode:'walking',label:'walk'},{budget:20,mode:'driving',label:'drive'}];
      try{
        const [place,data]=await Promise.all([lookupZip(zip,signal),catalog()]);signal.throwIfAborted();
        const candidates=model.nearbyCandidates(data.stops,place.coordinates,radius,8);
        if(candidates.length<2){status(zip+' · '+place.name+': '+candidates.length+' eligible stop'+(candidates.length===1?'':'s')+' found within '+radius+' miles. At least two are needed for a multi-stop tour. Try a wider radius or add your own addresses; this catalog is incomplete.');return;}
        status('Checking walking paths and driving routes for '+candidates.length+' nearby stops…');
        const points=candidates.map(s=>({...s.location,matchedAddress:s.address})),matrices={},errors={};
        for(const mode of ['walking','driving']){try{matrices[mode]=await routing.matrix(points,mode,signal);}catch(error){if(signal.aborted)throw error;errors[mode]=error.message;}}
        for(const preset of presets){
          signal.throwIfAborted();status('Checking the '+preset.budget+'-minute '+preset.label+', including '+options.dwell+' minutes at each stop…');
          if(!matrices[preset.mode]){$('ct-auto-results').append(emptyCard(preset,'Route timing unavailable. Please retry.','Travel time is unknown. Retry when the routing service is available, or build a custom route.'));continue;}
          const plan=model.findTour(candidates,matrices[preset.mode],{...options,budget:preset.budget});
          if(!plan){const incomplete=matrices[preset.mode].some((row,i)=>row.some((value,j)=>i!==j&&value===null));$('ct-auto-results').append(emptyCard(preset,'No '+(incomplete?'verified ':'')+'two-stop '+preset.label+' fits this budget in the checked set.',incomplete?'Some stops or paths could not be routed. Try a wider radius or add your own addresses.':undefined));continue;}
          let indices=[...plan.indices],route,chosen,chosenPoints;
          try{
            while(indices.length>=2){
              chosen=indices.map(i=>candidates[i]);chosenPoints=indices.map(i=>points[i]);
              route=await routing.route(options.roundTrip?[...chosenPoints,chosenPoints[0]]:chosenPoints,preset.mode,signal);signal.throwIfAborted();
              if(timing.assessTime(route,preset.budget,options.dwell,chosen.length).fits)break;
              indices.pop();route=null;
            }
            if(job!==generation)return;
            $('ct-auto-results').append(route?resultCard(preset,{stops:chosen,points:chosenPoints,route,...options,budget:preset.budget,mode:preset.mode}):emptyCard(preset,'The full route exceeds this budget.'));
          }catch(error){if(signal.aborted)throw error;errors[preset.mode]=error.message;$('ct-auto-results').append(emptyCard(preset,'Route could not be verified. Please retry.','Travel time is unknown. Retry when the routing service is available, or build a custom route.'));}
        }
        status(zip+' · '+place.name+' · '+candidates.length+' nearest eligible stops checked within '+radius+' miles. Includes '+options.dwell+' min looking at every stop. Address supplement: '+data.updated+'.'+(Object.keys(errors).length?' Some route estimates are unavailable.':''));
      }catch(error){if(job===generation&&!signal.aborted)status(error.message||'Suggestions are unavailable. Please retry.');}
      finally{if(job===generation)$('ct-auto-submit').disabled=false;}
    };
  }
  window.TourSuggestions={create};
})();
