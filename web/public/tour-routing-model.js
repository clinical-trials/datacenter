/* Network-route measurements. Never replace an unavailable route with straight-line timing. */
(function(root){
  'use strict';
  const coordinate=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  const metric=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const line=g=>g?.type==='LineString'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2&&g.coordinates.every(coordinate);
  function readRoute(data,count){
    const r=data?.routes?.[0];
    if(data?.code!=='Ok'||!r)throw Error('No route was found for these stops and this travel mode.');
    if(!metric(r.duration)||!metric(r.distance)||!line(r.geometry)||r.legs?.length!==count-1||data.waypoints?.length!==count)throw Error('The routing service returned an incomplete route. Please retry.');
    if(data.waypoints.some(p=>!coordinate(p.location)||!metric(p.distance)||p.distance>100))throw Error('A stop is too far from a mapped road or path. Check its address before routing.');
    const legs=r.legs.map(l=>{
      if(!metric(l.duration)||!metric(l.distance))throw Error('A route leg has no usable time or distance.');
      const coordinates=(l.steps||[]).flatMap(s=>line(s.geometry)?s.geometry.coordinates:[]);
      return {duration:l.duration,distance:l.distance,coordinates};
    });
    if(Math.abs(legs.reduce((s,l)=>s+l.duration,0)-r.duration)>2)throw Error('The route times do not agree. Please retry.');
    return {duration:r.duration,distance:r.distance,geometry:r.geometry,legs,waypoints:data.waypoints.map(w=>w.location),checked:new Date().toISOString()};
  }
  function assessTime(route,budget,dwell,stopCount){
    if(!route||!Number.isFinite(budget)||budget<=0||!Number.isFinite(dwell)||dwell<0)return null;
    const total=route.duration+dwell*60*stopCount,arrivals=[0];let elapsed=0;
    route.legs.forEach((leg,i)=>{elapsed+=leg.duration+(i<stopCount?dwell*60:0);arrivals.push(elapsed);});
    return {total,travel:route.duration,pause:dwell*60*stopCount,fits:total<=budget*60,remaining:budget*60-total,arrivals};
  }
  function readGeocodes(data){
    return (Array.isArray(data?.result?.addressMatches)?data.result.addressMatches:[]).filter(m=>typeof m.matchedAddress==='string'&&coordinate([m.coordinates?.x,m.coordinates?.y])).map(m=>({matchedAddress:m.matchedAddress,coordinates:[m.coordinates.x,m.coordinates.y]}));
  }
  function formatTime(seconds){
    const rounded=Math.ceil(seconds),m=Math.floor(rounded/60),s=rounded%60;
    return (m?m+' min'+(s?' ':''):'')+(s?s+' sec':m?'':'0 min');
  }
  function routeKey(stops,roundTrip){return JSON.stringify([stops.map(s=>s.address.trim().toLowerCase()),!!roundTrip]);}
  const api={readRoute,assessTime,readGeocodes,formatTime,routeKey,coordinate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TourRoutingModel=api;
})(typeof window==='undefined'?globalThis:window);
