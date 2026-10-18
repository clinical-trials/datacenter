/* Imported research leads remain source-reported, never asserted as current law. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NationalMoratoria=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const labels={active:'Reported active',extended:'Reported extended',pending:'Reported proposed',replaced:'Reported replaced',expired:'Reported expired',rescinded:'Reported rescinded'};
 const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const https=s=>{try{return new URL(s).protocol==='https:';}catch{return false;}};
 function valid(d){return !!(d&&d.schemaVersion===1&&iso(d.sourceAsOf)&&iso(d.importedAt)&&d.source&&https(d.source.url)&&https(d.source.licenseUrl)&&/^[a-f0-9]{40}$/.test(d.source.revision)&&Array.isArray(d.records)&&d.records.length&&new Set(d.records.map(r=>r.id)).size===d.records.length&&d.records.every(r=>/^[a-z0-9-]+$/.test(r.id)&&/^[A-Z]{2}$/.test(r.state)&&r.jurisdiction&&r.level&&Object.hasOwn(labels,r.reportedStatus)&&https(r.sourceUrl)&&typeof r.flagged==='boolean'&&['term','basis','detail','dateNote'].every(k=>typeof r[k]==='string')&&(!r.endDate||iso(r.endDate))&&(!r.correction||https(r.correction.url)&&r.correction.text)));}
 function filter(rows,{state='all',status='all',search=''}={}){const q=search.trim().toLocaleLowerCase();return rows.filter(r=>(state==='all'||r.state===state)&&(status==='all'||r.reportedStatus===status)&&(!q||[r.jurisdiction,r.state,r.level,r.basis].join(' ').toLocaleLowerCase().includes(q)));}
 function datePassed(r,now){return ['active','extended','pending'].includes(r.reportedStatus)&&iso(r.endDate)&&r.endDate<=now;}
 return {labels,valid,filter,datePassed};
});
