(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CountFeed=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';const phases=['operating','under_construction','planned'];
 function valid(row,now=Date.now()){
  if(!row||!phases.every(k=>Number.isInteger(row[k])&&row[k]>=0&&row[k]<=100000))return false;
  const stamp=Date.parse(row.observed_at||row.date);if(!Number.isFinite(stamp)||stamp>now+60000)return false;
  if(row.total!==undefined&&row.total!==phases.reduce((n,k)=>n+row[k],0))return false;
  for(const [key,phase] of [['planned_by_state','planned'],['construction_by_state','under_construction'],['operating_by_state','operating']]){
   if(row[key]!==undefined){if(!row[key]||Array.isArray(row[key])||typeof row[key]!=='object')return false;const values=Object.values(row[key]);if(values.some(n=>!Number.isInteger(n)||n<0)||values.reduce((a,b)=>a+b,0)!==row[phase])return false;}
  }return true;
 }
 function merge(...groups){const found=new Map();for(const row of groups.flat())if(valid(row)){const key=(row.series||row.source||'unknown')+'|'+(row.observed_at||row.date);found.set(key,row);}return [...found.values()].sort((a,b)=>Date.parse(b.observed_at||b.date)-Date.parse(a.observed_at||a.date));}
 function previous(rows){const current=rows[0];return current?.series?rows.slice(1).find(r=>r.series===current.series):undefined;}
 return{valid,merge,previous};
});
