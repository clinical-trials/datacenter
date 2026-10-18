'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
const {staticRecords,facilityImports,bundledSupplement,aggregate,recordCheck}=require('./model.cjs');
const ROOT=path.resolve(__dirname,'../..'),ORIGIN='https://usdatamap.com';
async function get(url,headers={}){
 const response=await fetch(url,{headers,signal:AbortSignal.timeout(25000),redirect:'error'});
 if(!response.ok)throw Error('Source response '+response.status);
 const text=await response.text();if(text.length>5000000)throw Error('Source exceeds expected size');return text;
}
async function collect(){
 const html=await get(ORIGIN+'/');
 const script=html.match(/<script[^>]+src="(\/assets\/index-[A-Za-z0-9_-]+\.js)"/);
 if(!script)throw Error('Source entrypoint changed');
 const code=await get(ORIGIN+script[1]),external=new Map();
 for(const imported of facilityImports(code))external.set(imported.name,staticRecords(await get(new URL(imported.file,ORIGIN+script[1]).href)));
 const base=staticRecords(code,external);
 if(base.length<100)throw Error('Incomplete base directory');
 // This is the anonymous, public browser endpoint used by the source itself.
 // Its public browser key remains in memory and is never logged or saved.
 const hosts=[...new Set(code.match(/https:\/\/[a-z]+\.supabase\.co/g))];
 if(hosts.length!==1||!code.includes('"data-centers-list"'))throw Error('Public directory endpoint changed');
 const host=hosts[0];let key;
 for(const candidate of code.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[]){
  try{const payload=JSON.parse(Buffer.from(candidate.split('.')[1],'base64url'));if(payload.role==='anon'&&host===`https://${payload.ref}.supabase.co`)key=candidate;}catch{}
 }
 if(!key)throw Error('Public directory configuration changed');
 const payload=JSON.parse(await get(host+'/functions/v1/data-centers-list',{apikey:key,Authorization:'Bearer '+key}));
 if(!Array.isArray(payload.items))throw Error('Public directory response changed');
 const counts=aggregate(base,payload.items);
 const advertised=html.match(/<title>[^<]*?([\d,]+) Facilities/);
 const bundled=aggregate(base,bundledSupplement(code));
 if(!advertised||Number(advertised[1].replaceAll(',',''))!==bundled.total)throw Error('Bundled directory does not reconcile with the published static total');
 const observed_at=new Date().toISOString();
 return {date:observed_at.slice(0,10),observed_at,...counts,source:'USDataMap directory',source_url:ORIGIN+'/',series:'usdatamap-directory-v1',geography:'United States and Washington, D.C.; Puerto Rico coverage not established',counting_unit:'Directory records; facilities and campuses may be mixed',verification:'Directory-reported; not independently verified',source_bundle_sha256:createHash('sha256').update(code).digest('hex'),source_static_total:bundled.total,notes:'Aggregated from the source’s base directory and current approved public records, deduplicated by ID or normalized company + state + name. The bundled layers must reconcile with the static page total before current records are accepted; the live total can differ from cached page metadata. Existing is mapped to reported operating. No facility-level dataset is redistributed. Additions and reclassifications are not proof of new construction or openings. Missing state categories are unavailable, not a verified zero.'};
}
async function main(){
 const file=path.join(ROOT,'site/data-center-counts.json'),previous=JSON.parse(await fs.readFile(file,'utf8'));
 let snapshot,error;try{snapshot=await collect();}catch(e){error=e;console.error('Count update failed:',e.message);}
 const result=recordCheck(previous,snapshot,new Date().toISOString(),error),body=JSON.stringify(result,null,2)+'\n';
 for(const target of ['site/data-center-counts.json','web/public/data-center-counts.json'])await fs.writeFile(path.join(ROOT,target),body);
 if(error)process.exitCode=1;else console.log(JSON.stringify({observed_at:snapshot.observed_at,operating:snapshot.operating,under_construction:snapshot.under_construction,planned:snapshot.planned,total:snapshot.total}));
}
if(require.main===module)main().catch(()=>{console.error('Could not store the count observation');process.exitCode=1;});
module.exports={collect};
