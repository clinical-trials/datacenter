/* Portable route logic: phone links never rely on more than three waypoints. */
(function(root){
  'use strict';
  const clean=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
  function normalizeStop(raw){
    if(!raw||typeof raw!=='object')return null;
    const name=clean(raw.name,100),address=clean(raw.address,180);
    if(!name||!address||address.includes('|')||encodeURIComponent(address).length>700)return null;
    let source='';try{const u=new URL(raw.source);if(['http:','https:'].includes(u.protocol))source=u.href;}catch{}
    let location;const c=raw.location?.coordinates;
    if(Array.isArray(c)&&c.length===2&&c.every(Number.isFinite)&&Math.abs(c[0])<=180&&Math.abs(c[1])<=90){try{const u=new URL(raw.location.source);if(['http:','https:'].includes(u.protocol))location={coordinates:[...c],source:u.href,label:clean(raw.location.label,160)||'Mapped representative point'};}catch{}}
    return {name,address,source,location,verification:clean(raw.verification,130)||'User-added · address not verified',phase:clean(raw.phase,160)||'Phase not verified',checked:clean(raw.checked,10),prompt:clean(raw.prompt,300),note:clean(raw.note,1500),visited:raw.visited===true,included:raw.included!==false};
  }
  function routeSegments(stops,mode='driving'){
    const travelmode=['driving','walking','bicycling'].includes(mode)?mode:'driving';
    const segments=[];
    for(let start=0;start<stops.length-1;){
      let end=Math.min(start+4,stops.length-1),url;
      do{
        const p=new URLSearchParams({api:'1',origin:stops[start].address,destination:stops[end].address,travelmode});
        if(end-start>1)p.set('waypoints',stops.slice(start+1,end).map(s=>s.address).join('|'));
        url='https://www.google.com/maps/dir/?'+p.toString();
        if(url.length<=2048)break;
        end--;
      }while(end>start);
      if(end===start)throw Error('A stop address is too long for a map link. Shorten it.');
      segments.push({start,end,url});start=end;
    }
    return segments;
  }
  function parseAddresses(text){
    const lines=typeof text==='string'?text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean):[];
    if(!lines.length)return {stops:[],error:'Add at least one address, one per line.'};
    if(lines.length>12)return {stops:[],error:'Use up to 12 addresses per tour.'};
    const stops=[];
    for(const [i,line] of lines.entries()){
      const divider=line.indexOf('—');
      const name=divider<0?line.split(',')[0].slice(0,100):line.slice(0,divider).trim();
      const address=(divider<0?line:line.slice(divider+1)).trim();
      const stop=address.length<=180&&normalizeStop({name,address});
      if(!stop)return {stops:[],error:'Check address '+(i+1)+': use a complete address under 180 characters, without a pipe (|).'};
      stops.push(stop);
    }
    return {stops,error:''};
  }
  const api={normalizeStop,routeSegments,parseAddresses};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TourModel=api;
})(typeof window==='undefined'?globalThis:window);
