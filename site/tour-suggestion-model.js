/* Bounded itinerary search over routed travel times, never distance/speed guesses. */
(function(root){
  'use strict';
  const valid=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  const metric=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
  const miles=(a,b)=>{const rad=Math.PI/180,dlat=(b[1]-a[1])*rad,dlon=(b[0]-a[0])*rad,h=Math.sin(dlat/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dlon/2)**2;return 7917.5226*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));};
  function nearbyCandidates(stops,center,radius,limit=8){
    if(!valid(center)||!Number.isFinite(radius)||radius<=0)return [];
    const rows=stops.filter(s=>s?.name&&s.address&&valid(s.location?.coordinates)).map(s=>({...s,distance:miles(center,s.location.coordinates)})).filter(s=>s.distance<=radius).sort((a,b)=>(a.priority??1)-(b.priority??1)||a.distance-b.distance),out=[];
    const key=s=>s.address.split(',')[0].toLowerCase().replace(/\b(northwest|northeast|southwest|southeast|avenue|boulevard|street|road)\b/g,w=>({northwest:'nw',northeast:'ne',southwest:'sw',southeast:'se',avenue:'ave',boulevard:'blvd',street:'st',road:'rd'}[w])).replace(/[^a-z0-9]/g,'');
    for(const row of rows){if(out.some(s=>miles(s.location.coordinates,row.location.coordinates)<0.02||(key(s)===key(row)&&miles(s.location.coordinates,row.location.coordinates)<0.25)))continue;out.push(row);}
    out.sort((a,b)=>a.distance-b.distance);return out.slice(0,Math.min(8,limit));
  }
  function readMatrix(data,count){
    if(data?.code!=='Ok'||data.durations?.length!==count||data.sources?.length!==count||data.destinations?.length!==count||data.durations.some(row=>!Array.isArray(row)||row.length!==count||row.some(n=>n!==null&&!metric(n))))throw Error('Travel-time comparison is unavailable. Please retry.');
    const good=i=>[data.sources[i],data.destinations[i]].every(p=>valid(p?.location)&&metric(p?.distance)&&p.distance<=100);
    return data.durations.map((row,i)=>row.map((v,j)=>good(i)&&good(j)?v:null));
  }
  function findTour(candidates,matrix,{budget,dwell,roundTrip=false}){
    const n=candidates.length;if(n<2||n>8||!Number.isFinite(budget)||budget<=0||!Number.isFinite(dwell)||dwell<0)return null;
    const limit=budget*60,pause=dwell*60;let best=null;
    function visit(path,mask,travel){
      const count=path.length,first=path[0],last=path[count-1],back=roundTrip?matrix[last]?.[first]:0;
      if(count>=2&&metric(back)){
        const total=travel+back+pause*count;
        if(total<=limit&&(!best||count>best.indices.length||(count===best.indices.length&&(candidates[first].distance<candidates[best.indices[0]].distance||(candidates[first].distance===candidates[best.indices[0]].distance&&total<best.total)))))best={indices:[...path],travel:travel+back,total};
      }
      if(count>=6)return;
      for(let next=0;next<n;next++){
        const leg=matrix[last]?.[next];if(mask&(1<<next)||!metric(leg))continue;
        if(travel+leg+pause*(count+1)>limit)continue;
        visit([...path,next],mask|(1<<next),travel+leg);
      }
    }
    for(let i=0;i<n;i++)visit([i],1<<i,0);
    return best;
  }
  const api={nearbyCandidates,readMatrix,findTour,miles};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TourSuggestionModel=api;
})(typeof window==='undefined'?globalThis:window);
