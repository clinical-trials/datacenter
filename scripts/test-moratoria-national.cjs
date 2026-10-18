const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../site/moratoria-national-model.js');
const data=JSON.parse(fs.readFileSync('site/moratoria-national.json','utf8'));
const cases=JSON.parse(fs.readFileSync('site/moratoria.json','utf8')).records;
test('national data is pinned, attributed, data-center-only and not counted as distinct jurisdictions',()=>{
 assert.equal(M.valid(data),true);assert.equal(data.records.length,1080);assert.equal(new Set(data.records.map(r=>r.state)).size,47);
 assert.equal(data.source.license,'CC-BY-4.0');assert.match(data.coverage,/Multiple instruments/);
 assert.equal(data.records.some(r=>r.level==='Aggregate meta-row'),false);
 assert.equal(M.valid({...data,records:[...data.records,data.records[0]]}),false);
 assert.equal(M.valid({...data,records:[{...data.records[0],sourceUrl:'javascript:alert(1)'}]}),false);
});
test('source statuses never turn into current-law findings and passed dates only prompt rechecking',()=>{
 const r={...data.records[0],reportedStatus:'active',endDate:'2026-10-18'};
 assert.equal(M.datePassed(r,'2026-10-17'),false);assert.equal(M.datePassed(r,'2026-10-18'),true);assert.equal(r.reportedStatus,'active');
 assert.equal(M.datePassed({...r,reportedStatus:'replaced'},'2026-10-18'),false);
 assert.equal(M.datePassed({...r,endDate:null},'2026-10-18'),false);
 assert.ok(Object.values(M.labels).every(s=>s.startsWith('Reported ')));
});
test('state, source-status and literal jurisdiction search intersect',()=>{
 assert.ok(M.filter(data.records,{state:'OH',status:'pending'}).length>0);
 assert.ok(M.filter(data.records,{state:'OH',status:'pending'}).every(r=>r.state==='OH'&&r.reportedStatus==='pending'));
 assert.equal(M.filter(data.records,{state:'PR'}).length,0);assert.equal(M.filter(data.records,{search:'[.*'}).length,0);
 assert.equal(M.filter(data.records,{state:'AZ',search:' PIMA '})[0].correction.reviewedId,'pima-az');
});
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
const pageData=JSON.parse(fs.readFileSync('site/index.html','utf8').match(/<script id="research-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
async function ui(fail=false,rows=data.records){
 const dom=new JSDOM('<div id="national"></div>',{runScripts:'outside-only',url:'https://example.test/#moratoria'}),w=dom.window;
 w.Moratoria={today:()=> '2026-10-18'};w.fetch=async()=>({ok:!fail,json:async()=>({...data,records:rows})});
 w.eval(fs.readFileSync('site/moratoria-national-model.js','utf8'));w.eval(fs.readFileSync('site/moratoria-national.js','utf8'));
 let selected=null;const opts={stateNames:{...Object.fromEntries(pageData.states.filter(s=>s.abbreviation!=='US').map(s=>[s.abbreviation,s.name])),DC:'District of Columbia',PR:'Puerto Rico'},reviewed:cases,onReviewed:id=>{selected=id;}};
 await w.mountNationalMoratoria(w.document.querySelector('#national'),opts);return {dom,d:w.document,w,selected:()=>selected};
}
test('directory paginates, supports all states plus DC and PR, and presents gaps honestly',async()=>{
 const {dom,d,w}=await ui();assert.equal(d.querySelectorAll('#mn-state option').length,53);assert.equal(d.querySelectorAll('.mn-record').length,24);
 d.querySelector('#mn-more').click();assert.equal(d.querySelectorAll('.mn-record').length,48);
 d.querySelector('#mn-state').value='OH';d.querySelector('#mn-state').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.mn-record').length,24);
 d.querySelector('[data-mn-state="PR"]').click();assert.equal(d.querySelectorAll('.mn-record').length,0);assert.match(d.querySelector('#mn-results').textContent,/coverage gap/);assert.ok(d.querySelector('#mn-more').hidden);
 d.querySelector('#mn-reset').click();assert.equal(d.querySelectorAll('.mn-record').length,24);dom.window.close();
});
test('Pima correction is visible, the disputed source date is not presented as fact, and reviewed case opens',async()=>{
 const {dom,d,w,selected}=await ui();d.querySelector('#mn-state').value='AZ';d.querySelector('#mn-state').dispatchEvent(new w.Event('change'));
 assert.match(d.querySelector('#mn-results').textContent,/September 22/);assert.doesNotMatch(d.querySelector('#mn-results').textContent,/adopted 3-2.*2026-08-11/);
 d.querySelector('[data-mn-case="pima-az"]').click();assert.equal(selected(),'pima-az');dom.window.close();
});
test('source prose is rendered as text and failed loading never fabricates totals',async()=>{
 const row={...data.records[0],jurisdiction:'<img src=x onerror=alert(1)>'};const a=await ui(false,[row]);
 assert.equal(a.d.querySelectorAll('img').length,0);assert.match(a.d.querySelector('.mn-record h3').textContent,/<img/);a.dom.window.close();
 const b=await ui(true);assert.ok(b.d.querySelector('[role=alert]'));assert.equal(b.d.querySelectorAll('.mn-scale').length,0);b.dom.window.close();
});
