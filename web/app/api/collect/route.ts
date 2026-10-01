import { database, addRecords } from '../../../lib/ledger';
import { readBody, recordKey } from '../../../lib/ledger-validation.mjs';
import { CEC_URL, COLLECTION_START, parseCec } from '../../../lib/cec-collector.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 try{await readBody(request);}catch(e){return Response.json({error:'Send a same-origin JSON request.'},{status:400});}
 const db=database();const now=new Date().toISOString();
 try{
 const last=await db.prepare('SELECT checked_at,result FROM source_checks WHERE source_id=? ORDER BY checked_at DESC LIMIT 1').bind('PS_CEC_DOCKET').first<any>();
 if(last&&Date.now()-Date.parse(last.checked_at)<60000)return Response.json({message:'A collection attempt was recorded within the last minute ('+last.result+'). Review the collection log; retry after one minute.',created:0},{headers:{'Cache-Control':'no-store'}});
 const response=await fetch(CEC_URL,{signal:AbortSignal.timeout(20000),redirect:'manual',headers:{'Accept':'text/html'}});
 if(!response.ok)throw Error('Official docket returned HTTP '+response.status+'. No access bypass was attempted.');
 const html=await response.text();if(html.length>4000000)throw Error('Docket exceeds the bounded collector size. Review manually.');
 const parsed=parseCec(html);const eligible=parsed.filter((r:any)=>r.filedDate>=COLLECTION_START);
 const existing=await db.prepare('SELECT dedupe_key FROM filings WHERE state=?').bind('CA').all();const known=new Set(existing.results.map((r:any)=>r.dedupe_key));
 const newRecords=[];for(const r of eligible)if(!known.has(await recordKey(r)))newRecords.push(r);
 const toSave=newRecords.slice(0,250);let created=0;for(let i=0;i<toSave.length;i+=50){const result=await addRecords(toSave.slice(i,i+50));created+=result.filter((r:any)=>r.created).length;}
 const partial=newRecords.length>toSave.length;const notes=`Read ${parsed.length} docket rows; ${eligible.length} dated from ${COLLECTION_START}; ${created} new metadata records saved for review.`+(partial?' More records remain; run again after one minute.':' No full-text interpretation or project verdict was automated.');
 await db.prepare('INSERT INTO source_checks (id,source_id,checked_at,result,records_found,notes) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),'PS_CEC_DOCKET',now,partial?'partial':'checked',created,notes).run();
 return Response.json({created,partial,scanned:parsed.length,collectionStart:COLLECTION_START,message:notes},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const message=e instanceof Error?e.message:'Collection failed';console.error('CEC collection',message);try{await db.prepare('INSERT INTO source_checks (id,source_id,checked_at,result,records_found,notes) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),'PS_CEC_DOCKET',now,'failed',0,message).run();}catch{}return Response.json({error:message},{status:502,headers:{'Cache-Control':'no-store'}});}
}
