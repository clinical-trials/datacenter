(()=>{'use strict';
const input=document.getElementById('zip-code'),form=document.getElementById('zip-form'),status=document.getElementById('zip-status'),result=document.getElementById('zip-result'),submit=document.getElementById('zip-submit');
let request=null,mapController=null;
function clearResults(){mapController?.destroy();mapController=null;result.replaceChildren();}
const make=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
const miles=(lat1,lon1,lat2,lon2)=>{const rad=Math.PI/180,dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad,a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;return 3958.7613*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));};
let locationData;
async function addNearby(place,container){
 const section=make('div',undefined,'nearby-results');container.append(section);section.append(make('p','Loading mapped locations…'));
 try{
  if(!locationData){const response=await fetch('nearby-locations.geojson');if(!response.ok)throw Error();locationData=await response.json();}
  if(!container.contains(section))return;
  const addressLayer=await window.FacilityAddresses.enrich(locationData.features);if(!container.contains(section))return;
  const lat=Number(place.latitude),lon=Number(place.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error();
  const rows=addressLayer.features.map((feature,index)=>({feature,index,distance:miles(lat,lon,feature.geometry.coordinates[1],feature.geometry.coordinates[0])})).filter(r=>Number.isFinite(r.distance)).sort((a,b)=>a.distance-b.distance);
  section.replaceChildren();const label=make('label','Search radius from ZIP reference point');label.htmlFor='nearby-radius';
  const select=make('select');select.id='nearby-radius';for(const n of [5,10,25,50,100,250]){const option=make('option',n+' miles');option.value=n;option.selected=n===25;select.append(option);}
  const addressOnly=make('input');addressOnly.type='checkbox';addressOnly.id='nearby-address-only';const addressToggle=make('label',undefined,'nearby-address-toggle');addressToggle.append(addressOnly,document.createTextNode('Only show records with street addresses'));
  const coverage=make('p',addressLayer.available?addressLayer.count+' of '+locationData.features.length+' map records have sourced street addresses · updated '+addressLayer.retrieved+'. Most are community-mapped, not independently verified.':'The address supplement could not load. Mapped locations are still available.','small');
    const summary=make('p',undefined,'small'),mapMount=make('div',undefined,'nearby-map-mount'),listHeading=make('h3','Meet the mapped places'),list=make('div',undefined,'nearby-list'),more=make('button','Meet more places ↓','btn');more.type='button';let limit=4,matches=[];
  function renderList(){
   summary.textContent=matches.length?matches.length+(addressOnly.checked?' address-listed record':' mapped record')+(matches.length===1?'':'s')+' within '+select.value+' miles · '+Math.min(limit,matches.length)+' listed below. Records may represent buildings and campuses at the same site.':(addressOnly.checked?'No sourced street addresses in this radius. Clear the address filter to see other mapped records.':'No records in this dataset within '+select.value+' miles. This does not mean no data centers exist or are planned nearby.');
   list.replaceChildren();
   for(const row of matches.slice(0,limit)){
    const p=row.feature.properties,card=make('article',undefined,'nearby-card'),heading=make('h3',window.FacilityAddresses.name(row.feature)),distance=make('strong','≈ '+(row.distance<10?row.distance.toFixed(1):Math.round(row.distance))+' mi','nearby-distance');
    const description=make('p',(p.address?.operator||p.operator||'Operator not provided')+' · '+(p.county||'County not provided')+', '+(p.state_abb||''));
    const phase=make('p','Phase: listed as existing in source; current operation not independently verified.','small');
    const precision=make('p','Location: '+(p.type||'source')+' representative point; approximate distance from ZIP, not your home.','small');
    const link=make('a','Inspect mapped location ↗');const [x,y]=row.feature.geometry.coordinates;link.href='https://www.openstreetmap.org/?mlat='+y+'&mlon='+x+'#map=16/'+y+'/'+x;link.target='_blank';link.rel='noopener noreferrer';
    card.append(distance,heading,description);if(p.address){card.append(make('p',[p.address.street,p.address.city,[p.address.state,p.address.postcode].filter(Boolean).join(' ')].filter(Boolean).join(', '),'nm-card-address'));}card.append(phase);const details=make('details');details.append(make('summary',p.address?'Address source & tour tools':'Location details'));window.FacilityAddresses.append(details,row.feature,{compact:true});details.append(precision);card.append(details);
    if(mapController){const show=make('button','Show on map ↑','btn nearby-map-select');show.type='button';show.onclick=()=>mapController?.select(row.index);card.append(show);}
    card.append(link);list.append(card);
   }
   more.hidden=matches.length<=limit;
  }
  function render(){matches=rows.filter(row=>row.distance<=Number(select.value)&&(!addressOnly.checked||row.feature.properties.address));renderList();mapController?.setRows(matches,Number(select.value));}
  select.onchange=()=>{limit=4;render();};addressOnly.onchange=()=>{limit=4;render();};more.onclick=()=>{limit+=4;renderList();};
  const notes=make('details'),ns=make('summary','Coverage, sources & downloads');notes.append(ns,make('p','PNNL/IM3 existing-location layer, v2026.02.09; 1,382 source records retrieved 07 October 2026. Incomplete, not a live construction or permit feed. No future-projection locations are included. Distances use straight-line calculations between source coordinates and the ZIP lookup point. Nearby does not establish exposure.','small'));
  for(const [name,url] of [['Dataset citation','https://doi.org/10.57931/3017294'],['© OpenStreetMap contributors','https://www.openstreetmap.org/copyright'],['ODbL 1.0 license','https://opendatacommons.org/licenses/odbl/1-0/'],['Download location data','nearby-locations.geojson'],['Source and provenance','nearby-provenance.json']]){const a=make('a',name);a.href=url;notes.append(a,document.createTextNode(' · '));}
  notes.append(make('p','Address matching requires an exact normalized name, compatible operator, location within 25 metres and an unambiguous street/unit. Operator and contact-address checks are labeled separately. Address enrichment does not verify operating status or add facilities to the national counts.','small'));const addressDownload=make('a','Download address supplement (ODbL)');addressDownload.href='nearby-addresses.json';notes.append(addressDownload);
  notes.prepend(coverage);section.append(label,select,addressToggle,summary,mapMount,listHeading,list,more,notes);render();
  try{
   const controller=await window.NearbyMap.create({mount:mapMount,place});
   if(!container.contains(section)){controller?.destroy();return;}
   mapController=controller;mapController?.setRows(matches,Number(select.value));renderList();
  }catch{mapMount.textContent='The interactive map could not load. The location list and source links below are still available.';}
 }catch{section.replaceChildren(make('p','Location records could not load. Try again, or open Project watch for reviewed state filings.'));}
}
document.addEventListener('click',event=>{if(event.target.closest('[data-nearby]')){view('nearby');document.getElementById('nearby-search').scrollIntoView({block:'start'});input.focus({preventScroll:true});}});

input.addEventListener('input',()=>{const original=input.value;input.value=original.replace(/[^0-9]/g,'').slice(0,5);input.removeAttribute('aria-invalid');clearResults();status.textContent=original===input.value?'':'Only numbers are kept. Enter all five ZIP digits.';if(request){request.abort();request=null;}submit.disabled=false;});
form.addEventListener('submit',async e=>{e.preventDefault();const zip=input.value;clearResults();if(!/^[0-9]{5}$/.test(zip)){status.textContent='Enter a five-digit US ZIP code.';input.setAttribute('aria-invalid','true');input.focus();return;}input.removeAttribute('aria-invalid');if(request)request.abort();const controller=new AbortController();request=controller;submit.disabled=true;status.textContent='Looking up your ZIP…';const timeout=setTimeout(()=>controller.abort(),10000);
try{const options={signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'};let response=await fetch('https://api.zippopotam.us/us/'+encodeURIComponent(zip),options);if(response.status===404&&/^00[679]/.test(zip))response=await fetch('https://api.zippopotam.us/pr/'+encodeURIComponent(zip),options);if(response.status===404)throw Error('ZIP not found by this lookup service. Check the five digits or open Project watch.');if(!response.ok)throw Error('ZIP lookup is unavailable. Open Project watch.');const data=await response.json();if(request!==controller||input.value!==zip)return;const rawPlace=data.places?.[0],place=rawPlace&&data['country abbreviation']==='PR'?{...rawPlace,state:'Puerto Rico','state abbreviation':'PR'}:rawPlace,state=place?.['state abbreviation'];if(!place||!state)throw Error('No location was returned. Open Project watch.');status.textContent='ZIP located.';const title=document.createElement('h3');title.textContent=zip+' · '+place['place name']+', '+state;const note=document.createElement('p');note.textContent='Pins are a starting point. Distances are from your ZIP area, not your front door. Coverage is incomplete; a pin does not measure pollution.';result.append(title,note);const tour=make('button','Turn this ZIP into a short tour →','btn primary');tour.type='button';tour.onclick=()=>window.dispatchEvent(new Event('footprint:neighborhoodtour'));result.append(tour);addNearby(place,result);const stateFilter=document.getElementById('filing-state');if([...stateFilter.options].some(o=>o.value===state)){const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Show '+place.state+' filings';button.onclick=()=>{view('ledger');stateFilter.value=state;document.getElementById('filing-search').value='';document.getElementById('filing-type').value='';document.getElementById('filing-review').value='';stateFilter.dispatchEvent(new Event('change',{bubbles:true}));const target=document.getElementById('ledger-filters');target.scrollIntoView({block:'start',behavior:'instant'});stateFilter.focus({preventScroll:true});};result.append(button);}else{note.textContent+=' This jurisdiction is not covered by the current filing filters.';}
}catch(error){if(request===controller)status.textContent=error.name==='AbortError'?'Lookup timed out. Try again or open Project watch.':error.message;}finally{clearTimeout(timeout);if(request===controller){request=null;submit.disabled=false;}}});
})();
