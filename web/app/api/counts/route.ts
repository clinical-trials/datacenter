import {database} from '../../../lib/ledger';
import {readBody} from '../../../lib/ledger-validation.mjs';
import {validateSnapshot} from '../../../lib/counts-validation.mjs';
export const dynamic='force-dynamic';
const SOURCE='PS_DIRECTORY_COUNTS';const headers={'Cache-Control':'no-store'};
export async function GET(){try{const rows=await database().prepare('SELECT checked_at,result,notes FROM source_checks WHERE source_id=? ORDER BY checked_at DESC LIMIT 90').bind(SOURCE).all();return Response.json({checks:rows.results.map((r:any)=>({checked_at:r.checked_at,result:r.result,...JSON.parse(r.notes)}))},{headers});}catch{return Response.json({error:'Updates unavailable; retain the last recorded snapshot.'},{status:503,headers});}}
// Shared writer protected by the owner-private Sites dispatcher, including service access.
// Do not expose this route publicly without adding application-level writer authorization.
export async function POST(request:Request){let body:any;try{body=await readBody(request);}catch{return Response.json({error:'A bounded JSON request is required.'},{status:400,headers});}
 let payload:any,result:string;try{if(body.result==='failed'){if(typeof body.notes!=='string'||body.notes.length<1||body.notes.length>2000)throw Error('Failure reason required');payload={notes:body.notes};result='failed';}else{payload={snapshot:validateSnapshot(body)};result='snapshot';}}catch(e){return Response.json({error:(e as Error).message},{status:400,headers});}
 try{const now=new Date().toISOString();const key=result==='snapshot'?SOURCE+'-'+payload.snapshot.observed_at:crypto.randomUUID();await database().prepare('INSERT INTO source_checks (id,source_id,checked_at,result,records_found,notes) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind(key,SOURCE,now,result,payload.snapshot?.total||0,JSON.stringify(payload)).run();return Response.json({saved:true,result,checked_at:now},{headers});}catch{return Response.json({error:'Snapshot could not be saved.'},{status:503,headers});}}
