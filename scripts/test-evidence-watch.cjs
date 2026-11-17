const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
const data=JSON.parse(fs.readFileSync('site/evidence-watch.json','utf8'));
async function setup(fail=false){
 const dom=new JSDOM('<nav class="nav"><button data-view="research">Research</button></nav><select id="mobile-view"><optgroup label="Investigate"></optgroup></select><main><section id="view-health"><div class="ai-service"></div></section><section id="view-research"><div class="pagehead"></div></section><section id="view-citizen" hidden></section></main>',{url:'https://example.test/#evidence-watch',runScripts:'outside-only'});
 dom.window.view=name=>{dom.window.document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='view-'+name);};
 dom.window.fetch=async()=>{if(fail)throw Error('offline');return{ok:true,json:async()=>data};};
 dom.window.eval(fs.readFileSync('site/evidence-watch.js','utf8'));
 await new Promise(r=>setImmediate(r));return{dom,d:dom.window.document,w:dom.window};
}
test('direct evidence link opens a real view and each exploration shows only its panel',async()=>{
 const {dom,d}=await setup();try{
  assert.equal(d.querySelector('#view-evidence-watch').hidden,false);
  assert.equal(d.querySelectorAll('.ew-panel:not([hidden])').length,1);
  d.querySelector('[data-ew-tab="engines"]').click();
  assert.equal(d.querySelector('#ew-engines').hidden,false);assert.equal(d.querySelector('#ew-health').hidden,true);
  assert.equal(d.querySelector('[data-ew-tab="engines"]').getAttribute('aria-pressed'),'true');
  assert.ok(d.querySelector('#mobile-view option[value="evidence-watch"]'));
 }finally{dom.window.close();}
});
test('negotiating brief contains only selected priorities and clearly identifies proposals',async()=>{
 const {dom,d,w}=await setup();try{
  assert.equal(d.querySelector('#ew-download').disabled,true);
  const c=d.querySelector('[data-ew-priority="compute"]');c.checked=true;c.dispatchEvent(new w.Event('change'));
  const text=d.querySelector('#ew-draft').value;
  assert.match(text,/Community-directed AI and computing/);assert.match(text,/GPU-hours/);
  assert.match(text,/added electricity, water and emissions/);assert.match(text,/not a signed agreement/);
  assert.doesNotMatch(text,/Independent breathing-health evidence/);
  assert.equal(d.querySelector('#ew-download').disabled,false);
  c.checked=false;c.dispatchEvent(new w.Event('change'));assert.equal(d.querySelector('#ew-download').disabled,true);
 }finally{dom.window.close();}
});
test('records preserve preprint and pledge statuses and use primary https citations',()=>{
 assert.equal(data.reviewed,'2026-11-17');
 assert.match(data.publications.find(x=>x.id==='qiang2026').status,/Preprint/);
 assert.match(data.agreements.find(x=>x.id==='aws-built').status,/pledge/);
 assert.match(data.equipment.find(x=>x.id==='ftai').finding,/2027/);
 for(const r of [...data.publications,...data.equipment,...data.agreements]){assert.ok(r.url.startsWith('https://'));assert.ok(r.limit);assert.ok(r.status);assert.ok(r.date);}
});
test('failed source load presents an error and no sourced figures or brief',async()=>{
 const {dom,d}=await setup(true);try{
  assert.match(d.querySelector('#view-evidence-watch').textContent,/unavailable/);
  assert.equal(d.querySelectorAll('.ew-source').length,0);assert.equal(d.querySelector('#ew-draft'),null);
 }finally{dom.window.close();}
});
