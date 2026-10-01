import { env } from 'cloudflare:workers';
import { validateRecord, recordKey, REVIEWS } from './ledger-validation.mjs';
export function database(){if(!env.DB)throw Error('Persistent evidence storage is unavailable. Please retry.');return env.DB;}
export function publicRow(row:any){return {...JSON.parse(row.payload),id:row.id,reviewStatus:row.review_status,version:row.version,firstSeen:row.first_seen,updatedAt:row.updated_at};}
export async function listFilings(){const rows=await database().prepare('SELECT * FROM filings ORDER BY filed_date DESC, first_seen DESC LIMIT 5001').all();return {records:rows.results.slice(0,5000).map(publicRow),truncated:rows.results.length>5000};}
export async function addRecords(inputs:any[]){
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>50)throw Error('Import 1–50 filing records at a time.');
 const normalized=inputs.map(validateRecord);const now=new Date().toISOString();const db=database();const statements=[];const ids=[];
 for(const record of normalized){const key=await recordKey(record);const id='filing-'+key.slice(0,24);ids.push(id);
 statements.push(db.prepare('INSERT INTO filings (id,dedupe_key,project,state,filed_date,review_status,payload,version,first_seen,updated_at) VALUES (?,?,?,?,?,?,?,1,?,?) ON CONFLICT(dedupe_key) DO NOTHING').bind(id,key,record.project,record.state,record.documentDate,'unreviewed',JSON.stringify(record),now,now));
 }
 const results=await db.batch(statements);return results.map((r,i)=>({id:ids[i],created:r.meta.changes>0}));
}

export async function reviewRecord(input:any){
 if(typeof input.id!=='string'||!Number.isInteger(input.version)||!REVIEWS.includes(input.reviewStatus)||typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>1500||typeof input.reviewer!=='string'||!input.reviewer.trim()||input.reviewer.length>120)throw Error('Provide current version, review status, reviewer name and a specific review note.');
 const db=database();const row=await db.prepare('SELECT * FROM filings WHERE id=?').bind(input.id).first<any>();
 if(!row)throw Error('Filing not found.');if(row.version!==input.version)throw Error('This filing changed. Reload before reviewing.');
 const now=new Date().toISOString();const newPayload=JSON.stringify({...JSON.parse(row.payload),reviewStatus:input.reviewStatus,reviewNote:input.reason.trim(),reviewer:input.reviewer.trim()});
 const eventId=crypto.randomUUID();
 const batch=await db.batch([
 db.prepare('INSERT INTO filing_revisions (id,filing_id,version,payload,reason,reviewer,created_at) SELECT ?,id,version,payload,?,?,? FROM filings WHERE id=? AND version=?').bind(eventId,input.reason.trim(),input.reviewer.trim(),now,input.id,input.version),
 db.prepare('UPDATE filings SET review_status=?,payload=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(input.reviewStatus,newPayload,now,input.id,input.version)
 ]);
 if(!batch[1].meta.changes)throw Error('This filing changed. Reload before reviewing.');
 return {id:input.id,version:input.version+1};
}
export async function correctRecord(input:any){
 if(typeof input.id!=='string'||!Number.isInteger(input.version)||typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>1500||typeof input.reviewer!=='string'||!input.reviewer.trim()||input.reviewer.length>120)throw Error('Provide current version, reviewer and a specific correction reason.');
 const record=validateRecord(input.record);const key=await recordKey(record);const now=new Date().toISOString();const db=database();
 const row=await db.prepare('SELECT version FROM filings WHERE id=?').bind(input.id).first<any>();if(!row)throw Error('Filing not found.');if(row.version!==input.version)throw Error('This filing changed. Reload before correcting.');
 const batch=await db.batch([
 db.prepare('INSERT INTO filing_revisions (id,filing_id,version,payload,reason,reviewer,created_at) SELECT ?,id,version,payload,?,?,? FROM filings WHERE id=? AND version=?').bind(crypto.randomUUID(),'Correction: '+input.reason.trim(),input.reviewer.trim(),now,input.id,input.version),
 db.prepare('UPDATE filings SET dedupe_key=?,project=?,state=?,filed_date=?,review_status=?,payload=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(key,record.project,record.state,record.documentDate,'unreviewed',JSON.stringify({...record,correctionNote:input.reason.trim(),correctedBy:input.reviewer.trim()}),now,input.id,input.version)
 ]);if(!batch[1].meta.changes)throw Error('This filing changed. Reload before correcting.');return {id:input.id,version:input.version+1,reviewStatus:'unreviewed'};
}
