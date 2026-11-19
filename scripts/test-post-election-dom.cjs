'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
const register=JSON.parse(fs.readFileSync('site/ballot-measures.json','utf8'));
async function setup({badAggregate=false,fail=false}={}){
 const dom=new JSDOM('<main><section id="view-citizen"></section><section id="view-decide"></section></main>',{url:'https://example.test/#vote',runScripts:'outside-only'}),w=dom.window,d=w.document;
 const RealDate=w.Date;w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:['2026-11-18T22:00:00Z']));}static now(){return Date.parse('2026-11-18T22:00:00Z');}};
 const html=new JSDOM(fs.readFileSync('site/index.html','utf8'));w.DATA=JSON.parse(html.window.document.getElementById('research-data').textContent);html.window.close();
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.view=name=>{d.body.dataset.view=name;d.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='view-'+name);};
 const data=structuredClone(register);if(badAggregate)data.postElection.favoringLimits=999;
 w.fetch=async()=>{if(fail)throw Error('Unavailable');return{ok:true,json:async()=>data};};
 w.eval(['ballot-model.js','ballot-measures.js'].map(n=>fs.readFileSync('site/'+n,'utf8')).join('\n'));
 await new Promise(r=>setImmediate(r));return{dom,w,d};
}
test('the update tells one aggregate story with three segments and keeps denominators distinct',async()=>{
 const {dom,d}=await setup();try{
  assert.equal(d.body.dataset.view,'vote');assert.match(d.querySelector('.vote-hero h1').textContent,/Voters favored limits/);
  assert.match(d.querySelector('#vote-story-title').textContent,/46 of 47 outcomes/);
  assert.equal(d.querySelectorAll('.vote-result-strip>span').length,3);assert.equal(d.querySelectorAll('.vote-result-key>div').length,3);
  assert.match(d.querySelector('.vote-advisory').textContent,/10 of the 47 questions were advisory/);
  assert.match(d.querySelector('.vote-source-note').textContent,/Nov 14, 2026/);assert.match(d.querySelector('.vote-source-note').textContent,/not a national opinion survey/);
  assert.match(d.querySelector('.vote-distribution').textContent,/57 measures, 53 decided outcomes and 4 still pending/);
  assert.match(d.querySelector('.vote-distribution').textContent,/different denominator from the 47/);
  assert.equal(d.querySelector('.vote-history').open,false);assert.match(d.querySelector('.vote-history').textContent,/38 measures/);
  assert.doesNotMatch(d.querySelector('.vote-hero').textContent,/38|34 then scheduled/);
 }finally{dom.window.close();}
});
test('local cases put outcome and legal limits ahead of collapsed ballot wording',async()=>{
 const {dom,d}=await setup();try{
  const bloomington=[...d.querySelectorAll('.vote-card')].find(c=>c.textContent.includes('Bloomington'));
  assert.ok(bloomington);assert.match(bloomington.querySelector('.vote-legal').textContent,/Nonbinding advisory vote/);
  assert.match(bloomington.querySelector('.vote-local-next').textContent,/separate City Council/);
  assert.equal(bloomington.querySelector('details').open,false);
  assert.ok(bloomington.querySelector('.vote-outcome').compareDocumentPosition(bloomington.querySelector('details'))&dom.window.Node.DOCUMENT_POSITION_FOLLOWING);
  const boulder=[...d.querySelectorAll('.vote-card')].find(c=>c.textContent.includes('Boulder City'));
  assert.match(boulder.querySelector('.vote-legal').textContent,/not a citywide or statewide/);
  assert.match(boulder.querySelector('.vote-result-status').textContent,/certification.*not independently verified/);
 }finally{dom.window.close();}
});
test('state filtering uses the current year register while missing places remain unknown',async()=>{
 const {dom,w,d}=await setup();try{
  assert.ok(d.querySelector('#vote-state option[value="PR"]'));assert.ok(d.querySelector('#vote-state option[value="DC"]'));
  d.querySelector('#vote-state').value='OH';d.querySelector('#vote-state').dispatchEvent(new w.Event('change'));
  assert.match(d.querySelector('#vote-selection').textContent,/Ohio: 21 measures/);assert.match(d.querySelector('#vote-selection').textContent,/Nov 14, 2026/);
  d.querySelector('#vote-state').value='PR';d.querySelector('#vote-state').dispatchEvent(new w.Event('change'));
  assert.match(d.querySelector('#vote-selection').textContent,/no year-to-date total is verified/);assert.equal(d.querySelectorAll('.vote-card').length,0);
  d.querySelector('#vote-reset').click();assert.equal(d.querySelectorAll('.vote-card').length,register.measures.length);
  d.querySelector('#vote-period').value='upcoming';d.querySelector('#vote-period').dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('.vote-card').length,0);
 }finally{dom.window.close();}
});
test('follow-up paths connect residents to calendar, writing help and nearby exploration',async()=>{
 const {dom,d}=await setup();try{
  for(const name of ['deadlines','citizen','nearby'])assert.ok(d.querySelector('.vote-next-links a[data-view="'+name+'"][href="#'+name+'"]'));
  assert.equal(d.querySelector('.vote-distribution').open,false);assert.equal(d.querySelector('.vote-method').open,false);
 }finally{dom.window.close();}
});
test('an invalid aggregate falls back to sourced cases without asserting its headline',async()=>{
 const {dom,d}=await setup({badAggregate:true});try{
  assert.ok(d.querySelector('.vote-aggregate-unavailable'));assert.equal(d.querySelector('.vote-story'),null);
  assert.doesNotMatch(d.querySelector('.vote-hero h1').textContent,/Voters favored limits/);
  assert.equal(d.querySelectorAll('.vote-card').length,register.measures.length);
 }finally{dom.window.close();}
 const failed=await setup({fail:true});try{assert.match(failed.d.querySelector('[role="alert"]').textContent,/could not load/);assert.equal(failed.d.querySelector('.vote-story'),null);assert.ok(failed.d.querySelector('#vote-retry'));}finally{failed.dom.window.close();}
});
