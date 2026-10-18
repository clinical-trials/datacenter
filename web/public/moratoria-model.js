/* Status is a dated finding. A passing deadline is never evidence of enactment or renewal. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Moratoria=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const labels={pause:'Adopted pause',ban:'Prohibition',proposed:'Proposed action',response:'Community response','not-in-force':'Not in force',recheck:'Needs a new check'};
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Los_Angeles'});
 const age=(a,b)=>(Date.parse(a)-Date.parse(b))/86400000;
 function valid(d){
  return !!(d&&d.schemaVersion===1&&iso(d.asOf)&&Array.isArray(d.records)&&d.records.length&&new Set(d.records.map(r=>r.id)).size===d.records.length&&d.records.every(r=>
   /^[a-z0-9-]+$/.test(r.id)&&/^[A-Z]{2}$/.test(r.state)&&['State','County','City','Town'].includes(r.level)&&Object.hasOwn(labels,r.status)&&r.status!=='recheck'&&iso(r.checked)&&r.checked<=d.asOf&&(!r.actionDate||iso(r.actionDate)&&r.actionDate<=d.asOf)&&(!r.endDate||iso(r.endDate))&&(!r.nextDate||iso(r.nextDate))&&['jurisdiction','summary','scope','exception','response','nextStep','term'].every(k=>typeof r[k]==='string'&&r[k].length>0)&&Array.isArray(r.sources)&&r.sources.length&&r.sources.every(s=>{try{return !!s.label&&new URL(s.url).protocol==='https:';}catch{return false;}})));
 }
 function status(r,date=today()){
  if(r.status==='pause'&&r.endDate&&date>=r.endDate)return'recheck';
  if(r.status==='proposed'&&r.nextDate&&date>r.nextDate)return'recheck';
  if(['pause','ban','proposed'].includes(r.status)&&age(date,r.checked)>45)return'recheck';
  return r.status;
 }
 function filter(rows,{state='all',status:kind='all',search=''}={},date=today()){
  const q=search.trim().toLocaleLowerCase();
  return rows.filter(r=>(state==='all'||r.state===state)&&(kind==='all'||status(r,date)===kind)&&(!q||[r.jurisdiction,r.state,r.summary,r.scope,r.response].join(' ').toLocaleLowerCase().includes(q)));
 }
 return{labels,valid,status,filter,today,age};
});
