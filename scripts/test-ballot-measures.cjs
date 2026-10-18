const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const model=require('../site/ballot-model.js');
test('election date is not a voting deadline or an inferred result',()=>{
 const m={electionDate:'2026-11-03'};
 assert.equal(model.phase(m,'2026-11-02'),'upcoming');
 assert.equal(model.phase(m,'2026-11-03'),'today');
 assert.equal(model.phase(m,'2026-11-04'),'past');
 assert.equal(model.phase({electionDate:null},'2026-11-04'),'unknown');
});
test('a missing jurisdiction remains unknown, never zero',()=>{
 const s={byState:{OH:20}};
 assert.equal(model.snapshotCount(s,'OH'),20);
 assert.equal(model.snapshotCount(s,'PR'),null);
 assert.equal(model.snapshotCount(s,'IN'),null);
});
test('state and election filters compose, including an empty selection',()=>{
 const rows=[{state:'NV',electionDate:'2026-11-03'},{state:'MI',electionDate:'2026-08-04'}];
 assert.equal(model.filter(rows,'all','upcoming','2026-10-18').length,1);
 assert.equal(model.filter(rows,'MI','past','2026-10-18').length,1);
 assert.equal(model.filter(rows,'PR','all','2026-10-18').length,0);
});
test('the national snapshot reconciles and every example links to official evidence',()=>{
 const d=JSON.parse(fs.readFileSync('site/ballot-measures.json','utf8'));
 assert.equal(Object.values(d.snapshot.byState).reduce((a,b)=>a+b,0),d.snapshot.total);
 assert.equal(d.snapshot.advisory+d.snapshot.other,d.snapshot.total);
 assert.equal(new Set(d.measures.map(m=>m.id)).size,d.measures.length);
 for(const m of d.measures){
   assert.match(m.electionDate,/^2026-\d{2}-\d{2}$/);
   assert.ok(m.yes && m.no && m.limit && m.jurisdiction);
   assert.ok(m.sources.some(s=>s.kind==='official' && /^https:\/\//.test(s.url)));
   if(m.outcome)assert.ok(m.sources.some(s=>s.role==='outcome'));
 }
});

test('the voting tab opens before sponsorship and footer content',()=>{
 const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
 const dom=new JSDOM('<main><section id="view-impact"></section><aside class="sponsor-space"></aside><footer>Research notes</footer></main>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w.DATA={states:[]};w.fetch=()=>new Promise(()=>{});
 w.eval(fs.readFileSync('site/ballot-measures.js','utf8'));
 for(const selector of ['.sponsor-space','footer']){
  assert.ok(w.document.querySelector('#view-vote').compareDocumentPosition(w.document.querySelector(selector)) & w.Node.DOCUMENT_POSITION_FOLLOWING);
 }
 dom.window.close();
});
