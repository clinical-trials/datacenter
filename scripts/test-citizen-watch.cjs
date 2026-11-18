const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
let model={};try{model=require('../site/citizen-watch-model.js');}catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
const source=(id,geography,title='Water accounting')=>({id,title,geography,year:2025,authors:'Researchers',theme:'water',url:'https://example.org/'+id,finding:'Compare consumption.',limitations:'A bounded study.',accessed:'2026-11-17'});
test('profile validation rejects invalid filters without broadening a named company match',()=>{
 assert.equal(typeof model.normalizeProfile,'function');
 assert.deepEqual(model.normalizeProfile({state:'zz',company:'__proto__',topics:['water','water','unknown'],includeGeneral:false}),{state:'all',company:'all',topics:['water'],includeGeneral:false});
 assert.equal(model.normalizeProfile({state:'pr',company:'GOOGLE'}).state,'PR');
});
test('state matching includes general research only when requested and does not infer location from the finding',()=>{
 assert.equal(typeof model.buildFeed,'function');
 const records=model.buildFeed({sources:[source('in','Indiana, United States'),source('ca','California, United States'),source('global','Global'),{...source('incidental','Finland'),finding:'Indiana should read this study.'}]});
 assert.deepEqual(model.filter(records,{state:'IN',topics:['water'],includeGeneral:false}).map(x=>x.id),['source:in']);
 assert.deepEqual(model.filter(records,{state:'IN',topics:['water'],includeGeneral:true}).map(x=>x.id),['source:in','source:global','source:incidental']);
});
test('named company matching excludes unknown companies and topic filters combine with state',()=>{
 const records=model.buildFeed({sources:[source('unknown','Indiana'),source('google','Indiana','Google cooling water'),{...source('air','Indiana','Google NOx emissions'),theme:'air pollution',finding:'Generator emissions.'}]});
 assert.deepEqual(model.filter(records,{state:'IN',company:'google',topics:['water'],includeGeneral:false}).map(x=>x.id),['source:google']);
 assert.equal(model.filter(records,{company:'amazon',topics:[]}).length,0);
});
test('publication years retain their precision and access dates are not publication dates',()=>{
 const r=model.buildFeed({sources:[source('year','Global'),{...source('undated','Global'),year:null}]});
 assert.equal(r[0].date,'2025');assert.ok(!r[0].dateLabel.includes('01-01'));
 assert.equal(r[1].date,'');assert.match(r[1].dateLabel,/not stated/i);assert.equal(r[1].checked,'2026-11-17');
});
test('first visit is unreviewed while saved comparisons identify added and changed records',()=>{
 const r=model.buildFeed({sources:[source('a','Global'),source('b','Global')]});
 assert.deepEqual(model.changes(r,null),{'source:a':'unreviewed','source:b':'unreviewed'});
 const baseline=Object.fromEntries(r.map(x=>[x.id,model.fingerprint(x)]));
 const changed=[{...r[0],summary:'A corrected finding.'},r[1],{...r[1],id:'source:c'}];
 assert.deepEqual(model.changes(changed,baseline),{'source:a':'changed','source:b':'seen','source:c':'added'});
 assert.equal(model.fingerprint({...r[0],checked:'2026-11-18'}),model.fingerprint(r[0]));
 assert.notEqual(model.fingerprint({...r[0],phase:'Operating'}),model.fingerprint(r[0]));
});
test('unsafe URLs and duplicate identities cannot become feed links',()=>{
 const records=model.buildFeed({sources:[source('ok','Global'),source('ok','Global'),{...source('bad','Global'),url:'javascript:alert(1)'},{...source('credentials','Global'),url:'https://user:secret@example.org/'}]});
 assert.equal(records.length,1);assert.equal(records[0].url,'https://example.org/ok');
});
test('project records preserve payment status, phase and source dates without manufacturing totals',()=>{
 const money=JSON.parse(fs.readFileSync('site/follow-dollar-projects.json','utf8'));
 const rows=model.buildFeed({money});const received=rows.find(x=>x.id.includes('in-road-received'));
 assert.ok(received);assert.match(received.summary,/\$7M/);assert.match(received.summary,/County reports receipt/);
 assert.match(received.phase,/Operating/);assert.deepEqual(received.states,['IN']);assert.deepEqual(received.companies,['amazon']);
 assert.match(received.limit,/not a bank/);assert.equal(rows.length,8);
});
test('official filings and events keep recorded deadlines and phase uncertainties visible',()=>{
 const rows=model.buildFeed({filings:{snapshotDate:'2026-10-01',records:[{id:'f',title:'Draft water permit',url:'https://agency.gov/permit',state:'IN',projectPhase:'unknown',publishedDate:'2026-09-25',commentDeadline:'2026-11-16',summary:'Proposed use',limitations:'No final decision'}]},events:[{id:'e',title:'Amazon hearing',url:'https://agency.gov/hearing',state:'Indiana',date:'2026-11-10',phase:'Draft air permit under review',checked:'2026-10-18'}]});
 assert.equal(rows[0].deadline,'2026-11-16');assert.match(rows[0].phase,/Not established/);assert.equal(rows[1].kind,'event');assert.deepEqual(rows[1].states,['IN']);
});
async function watchDOM(failMoney=false,blockStorage=false){
 const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
 const dom=new JSDOM(fs.readFileSync('site/index.html','utf8'),{url:'https://example.test/#my-watch',runScripts:'outside-only'});
 const w=dom.window;
 w.scrollTo=()=>{};
 if(blockStorage)w.Storage.prototype.setItem=()=>{throw Error('Storage blocked');};
 w.fetch=async url=>{if(failMoney&&url==='follow-dollar-projects.json')throw Error('Unavailable');return{ok:true,json:async()=>JSON.parse(fs.readFileSync('site/'+url,'utf8'))};};
 w.PublicEvents=require('../site/public-events.js');
 w.eval(['app.js','citizen-watch-model.js','citizen-watch.js'].map(f=>fs.readFileSync('site/'+f,'utf8')).join('\n'));
 await new Promise(r=>setImmediate(r));return{dom,w,d:w.document};
}
test('saved interests and explicit review marks work without implying first-visit freshness',async()=>{
 const {dom,w,d}=await watchDOM();try{
  assert.equal(d.body.dataset.view,'my-watch');
  assert.match(d.querySelector('#cw-result-status').textContent,/No review baseline yet/);
  d.querySelector('#cw-state').value='IN';d.querySelector('#cw-company').value='amazon';d.querySelector('#cw-general').checked=false;
  d.querySelector('#cw-state').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.ok(d.querySelectorAll('.cw-record').length>0);
  d.querySelector('#cw-save').click();assert.equal(JSON.parse(w.localStorage.getItem('footprint-citizen-watch-v1')).profile.state,'IN');
  d.querySelector('#cw-reviewed').click();assert.equal(d.querySelector('#cw-changes').disabled,false);
  d.querySelector('#cw-changes').checked=true;d.querySelector('#cw-changes').dispatchEvent(new w.Event('change'));
  assert.match(d.querySelector('#cw-records').textContent,/No added or changed records/);
  d.querySelector('#cw-forget').click();assert.equal(w.localStorage.getItem('footprint-citizen-watch-v1'),null);
 }finally{dom.window.close();}
});
test('a partial feed failure is explicit and blocked browser storage stays session-only',async()=>{
 const {dom,d}=await watchDOM(true,true);try{
  assert.match(d.querySelector('#cw-load-status').textContent,/could not be refreshed \(money\)/);
  assert.ok(d.querySelectorAll('.cw-record').length>0);
  d.querySelector('#cw-save').click();assert.match(d.querySelector('#cw-save-status').textContent,/session only/);
 }finally{dom.window.close();}
});
test('recent supplement papers are searchable without losing their publication status or limits',async()=>{
 const {dom,w,d}=await watchDOM();try{
  d.querySelector('#cw-company').value='xai';
  d.querySelector('#cw-company').dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.equal(d.querySelectorAll('.cw-record').length,2);
  assert.match(d.querySelector('#cw-records').textContent,/Preprint/);
  assert.match(d.querySelector('#cw-records').textContent,/No asthma cases were measured/);
 }finally{dom.window.close();}
});
