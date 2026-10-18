const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const M=require('../site/moratoria-model.js');
const data=JSON.parse(fs.readFileSync('site/moratoria.json','utf8'));
test('dated sources, jurisdiction scopes and legal status are required',()=>{
 assert.equal(M.valid(data),true);
 assert.equal(M.valid({...data,records:[...data.records,data.records[0]]}),false);
 assert.equal(M.valid({...data,records:[{...data.records[0],sources:[]}]}),false);
 assert.equal(M.valid({...data,records:[{...data.records[0],sources:[{label:'Bad',url:'javascript:alert(1)'}]}]}),false);
});
test('proposals and resident petitions never become an enacted pause automatically',()=>{
 const proposal={...data.records[0],status:'proposed',nextDate:'2026-10-20'};
 assert.equal(M.status(proposal,'2026-10-18'),'proposed');
 assert.equal(M.status(proposal,'2026-10-21'),'recheck');
 assert.equal(M.status({...proposal,status:'response'},'2026-10-21'),'response');
});
test('elapsed terms and stale active records become recheck, never presumed renewed',()=>{
 const r={...data.records[0],endDate:'2026-10-29'};
 assert.equal(M.status(r,'2026-10-28'),'pause');assert.equal(M.status(r,'2026-10-29'),'recheck');
 assert.equal(M.status({...r,endDate:null},'2026-12-03'),'recheck');
 assert.equal(M.status({...r,status:'not-in-force'},'2026-12-03'),'not-in-force');
});
test('state, literal search and status intersect; empty states imply missing coverage',()=>{
 assert.ok(M.filter(data.records,{state:'CA',status:'ban'},'2026-10-18').every(r=>r.state==='CA'&&r.status==='ban'));
 assert.equal(M.filter(data.records,{state:'PR'},'2026-10-18').length,0);
 assert.equal(M.filter(data.records,{search:' hIlLsBoRo '},'2026-10-18')[0].id,'hillsboro-or');
 assert.equal(M.filter(data.records,{search:'[.*'},'2026-10-18').length,0);
});
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
async function ui(fail=false){
 const dom=new JSDOM('<main><section id="view-indiana"><div class="pagehead"></div></section><aside class="sponsor-space"></aside><footer>Research notes</footer></main>',{runScripts:'outside-only',url:'https://example.test/#moratoria'});
 const w=dom.window;w.DATA={states:[{abbreviation:'AZ',name:'Arizona'},{abbreviation:'CO',name:'Colorado'},{abbreviation:'MT',name:'Montana'},{abbreviation:'US',name:'United States'},{abbreviation:'CA',name:'California'},{abbreviation:'IN',name:'Indiana'},{abbreviation:'MD',name:'Maryland'},{abbreviation:'ME',name:'Maine'},{abbreviation:'FL',name:'Florida'},{abbreviation:'NM',name:'New Mexico'},{abbreviation:'NY',name:'New York'},{abbreviation:'NC',name:'North Carolina'},{abbreviation:'OR',name:'Oregon'},{abbreviation:'VA',name:'Virginia'},{abbreviation:'WA',name:'Washington'},{abbreviation:'WI',name:'Wisconsin'}]};
 w.view=name=>{w.document.body.dataset.view=name;};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async url=>({ok:!fail,json:async()=>url.startsWith('moratoria-national.json')?JSON.parse(fs.readFileSync('site/moratoria-national.json','utf8')):data});
 w.eval(fs.readFileSync('site/moratoria-national-model.js','utf8'));w.eval(fs.readFileSync('site/moratoria-national.js','utf8'));
 w.eval(fs.readFileSync('site/moratoria-model.js','utf8'));w.Moratoria.today=()=>data.asOf;
 w.eval(fs.readFileSync('site/moratoria.js','utf8'));await new Promise(r=>setTimeout(r,0));return dom;
}
test('tab renders sourced records, filters locally, explains gaps, and resets',async()=>{
 const dom=await ui(),d=dom.window.document;
 assert.equal(d.body.dataset.view,'moratoria');assert.equal(d.querySelectorAll('.mor-record').length,data.records.length);
 d.querySelector('[data-mor-state="IN"]').click();assert.equal(d.querySelectorAll('.mor-record').length,3);
 d.querySelector('[data-mor-status="response"]').click();assert.equal(d.querySelectorAll('.mor-record').length,1);assert.match(d.querySelector('#mor-results').textContent,/Shelbyville/);
 d.querySelector('#mor-state').value='PR';d.querySelector('#mor-state').dispatchEvent(new dom.window.Event('change'));
 assert.match(d.querySelector('#mor-results').textContent,/coverage gap/);assert.doesNotMatch(d.querySelector('#mor-results').textContent,/No moratorium/);
 d.querySelector('#mor-reset').click();assert.equal(d.querySelectorAll('.mor-record').length,data.records.length);
 assert.ok(d.querySelector('.mor-sources a').href.startsWith('https:'));assert.equal(d.querySelectorAll('input[type=email]').length,0);
 dom.window.close();
});
test('unavailable evidence never displays fabricated zero-status counts',async()=>{
 const dom=await ui(true),d=dom.window.document;
 assert.ok(d.querySelector('[role=alert]'));assert.equal(d.querySelectorAll('.mor-stat').length,0);
 dom.window.fetch=async()=>({ok:true,json:async()=>data});d.querySelector('#mor-retry').click();await new Promise(r=>setTimeout(r,0));assert.equal(d.querySelectorAll('.mor-record').length,data.records.length);dom.window.close();
});

test('the section is before sponsorship and footer',async()=>{
 const dom=await ui(),d=dom.window.document;
 assert.ok(d.querySelector('#view-moratoria').compareDocumentPosition(d.querySelector('footer')) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
 dom.window.close();
});
