const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
const readData=()=>JSON.parse(fs.readFileSync('site/follow-dollar-projects.json','utf8'));
test('real records preserve scope, payment status and missing values',()=>{
 const data=readData();
 assert.deepEqual(data.projects.map(p=>p.state).sort(),['IN','VA']);
 const rows=data.projects.flatMap(p=>p.records);
 const road=rows.find(r=>r.id==='in-road-received');
 assert.equal(road.value,7000000);assert.equal(road.status,'reported_received');assert.equal(road.period,'By December 9, 2025; one-time contribution');
 const county=rows.find(r=>r.id==='in-road-county');
 assert.equal(county.value,12000000);assert.equal(county.status,'commitment');
 assert.equal(rows.find(r=>r.id==='va-tax-forecast').status,'government_projection');
 assert.equal(rows.find(r=>r.id==='in-tax-forecast').status,'operator_projection');
 for(const p of data.projects){
  assert.equal(p.taxReceived,null);assert.equal(p.healthCost,null);
  for(const r of p.records){
   assert.ok(r.period&&r.payer&&r.recipient&&r.scope&&r.limit);
   assert.ok(r.sources.length);
   for(const id of r.sources)assert.ok(data.sources[id]?.url.startsWith('https://'));
   if(r.status==='unknown')assert.equal(r.value,null);
  }
 }
});
async function setup(fail=false){
 const dom=new JSDOM('<div id="nm-follow-dollar"></div>',{url:'https://example.test/#nearby',runScripts:'outside-only'});
 let calls=0;dom.window.fetch=async()=>{calls++;if(fail&&calls===1)throw new Error('offline');return {ok:true,json:async()=>readData()};};
 for(const f of ['follow-dollar-model.js','follow-dollar.js','follow-dollar-projects.js'])dom.window.eval(fs.readFileSync('site/'+f,'utf8'));
 await new Promise(r=>setImmediate(r));
 return {dom,d:dom.window.document,w:dom.window};
}
test('real projects open by default and the fictional game cannot change their figures',async()=>{
 const {dom,d}=await setup();try{
  assert.equal(d.querySelector('#fd-real').hidden,false);assert.equal(d.querySelector('#fd-fiction').hidden,true);
  assert.equal(d.querySelectorAll('.fdp-project').length,2);
  const before=d.querySelector('#fd-real').textContent;
  d.querySelector('[data-fd-mode="fiction"]').click();
  assert.equal(d.querySelector('#fd-real').hidden,true);
  d.querySelector('[data-fd-relief="0"]').click();
  d.querySelector('[data-fd-mode="real"]').click();
  assert.equal(d.querySelector('#fd-real').textContent,before);
  assert.equal(d.querySelectorAll('.fdp-health-unknown').length,2);
 }finally{dom.window.close();}
});
test('received-only filter excludes forecasts and commitments without turning missing receipts into zero',async()=>{
 const {dom,d,w}=await setup();try{
  const control=d.querySelector('#fdp-received-only');control.checked=true;control.dispatchEvent(new w.Event('change'));
  const visible=[...d.querySelectorAll('.fdp-record')].filter(el=>!el.hidden);
  assert.equal(visible.length,2);
  assert.ok(visible.every(el=>el.dataset.status==='reported_received'));
  assert.ok(d.querySelector('[data-record="va-infra-received"]').textContent.includes('Amount not isolated'));
  assert.equal(d.querySelector('[data-record="in-road-county"]').hidden,true);
  assert.equal(d.querySelectorAll('.fdp-health-unknown').length,2);
 }finally{dom.window.close();}
});
test('a failed evidence load is explicit and can be retried',async()=>{
 const {dom,d}=await setup(true);try{
  assert.ok(d.querySelector('#fdp-retry'));
  assert.equal(d.querySelectorAll('.fdp-project').length,0);
  d.querySelector('#fdp-retry').click();await new Promise(r=>setImmediate(r));
  assert.equal(d.querySelectorAll('.fdp-project').length,2);
 }finally{dom.window.close();}
});
