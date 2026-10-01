export const CEC_URL='https://efiling.energy.ca.gov/Lists/DocketLog.aspx?docketnumber=26-SPPE-01';
export const COLLECTION_START='2026-10-01';
function decode(s){return s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const c=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return c<=0x10ffff?String.fromCodePoint(c):'';}).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
const clean=s=>decode(s.replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export function parseCec(html){
 const records=[];for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
 const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]);if(cells.length<3)continue;
 const tn=clean(cells[0]),date=clean(cells[1]).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);const link=cells[2].match(/<a\b[^>]*href="([^"]*GetDocument\.aspx[^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
 if(!/^\d+$/.test(tn)||!date||!link)continue;const filedDate=`${date[3]}-${date[1].padStart(2,'0')}-${date[2].padStart(2,'0')}`;
 const url=new URL(decode(link[1]),CEC_URL);if(url.origin!=='https://efiling.energy.ca.gov'||url.pathname!=='/GetDocument.aspx')continue;
 const title=clean(link[2]);const comment=/\bcomments?\b/i.test(title);
 records.push({project:'RB Inyokern Data Center',state:'CA',locality:'Inyokern',operator:'R&L Capital, Inc.',docket:'26-SPPE-01; TN '+tn,title:title.slice(0,400),url:url.href,filedDate,documentType:comment?'public-comment':'other',projectPhase:'unknown',summary:'Discovered in the official CEC docket log. The linked full text has not yet been reviewed.',limitations:'Docket metadata only. Document contents, project status, quantities and any claim of impact require review. A public filing is not an agency endorsement.',reportedPosition:'neutral',sourceId:'PS_CEC_DOCKET',sourceKind:comment?'community':'official',metrics:[],pageOrSection:'Docket log, TN '+tn,accessedDate:new Date().toISOString().slice(0,10)});
 }
 if(!records.length)throw Error('No recognizable document rows; the source layout may have changed. No success is recorded.');return records;
}
