const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
const data=JSON.parse(fs.readFileSync('site/green-practices.json','utf8'));
test('bibliographic supplement preserves evidence periods and measured-versus-projected quantities',()=>{
 const s=Object.fromEntries(data.sources.map(x=>[x.id,x]));
 assert.equal(Object.keys(s).length,17);
 assert.equal(s.GREEN01.year,2018);assert.equal(s.GREEN02.year,2020);
 assert.ok(s.GREEN02.metrics.every(m=>m.period.includes('2019')));
 assert.equal(s.GREEN03.metrics.find(x=>x.metric==='LUMI PUE').value,1.25);
 assert.match(s.GREEN10.metrics.find(x=>x.value===8).status,/proposal/);
 assert.match(s.GREEN16.limitations,/not CO2-only/);
 for(const id of ['GREEN05','GREEN06','GREEN07','GREEN08','GREEN09','GREEN10'])assert.equal(s[id].year,null);
 for(const r of data.sources){assert.ok(r.url.startsWith('https://'));assert.equal(r.accessed,'2026-11-17');assert.ok(r.limitations);}
});
test('the citizen guide opens directly with source links and no invented operating measurements',async()=>{
 const dom=new JSDOM('<nav class="nav"><button data-view="evidence-watch">Evidence</button></nav><select id="mobile-view"><optgroup label="Investigate"></optgroup></select><main><section id="view-sources"><div class="pagehead"></div></section><section id="view-research"><div class="pagehead"></div></section></main>',{url:'https://example.test/#green-practices',runScripts:'outside-only'});
 try{
  dom.window.view=name=>dom.window.document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!=='view-'+name);
  dom.window.fetch=async()=>({ok:true,json:async()=>data});dom.window.eval(fs.readFileSync('site/green-practices.js','utf8'));
  await new Promise(r=>setImmediate(r));const d=dom.window.document;
  assert.equal(d.querySelector('#view-green-practices').hidden,false);
  assert.ok(d.querySelector('.gp-commons'));assert.ok(d.querySelector('.gp-feedback'));
  assert.equal(d.querySelectorAll('.gp-extra').length,6);
  assert.match(d.querySelector('.gp-downloads').textContent,/17 new references/);
  assert.match(d.querySelector('.gp-replication').textContent,/195,000 kWh/);
  assert.ok(d.querySelector('a[href="https://pubmed.ncbi.nlm.nih.gov/42288583/"]'));
  assert.ok(d.querySelector('#mobile-view option[value="green-practices"]'));
 }finally{dom.window.close();}
});
