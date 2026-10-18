const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../site/citizen-projects.js');
const catalog={schema_version:1,observed_at:'2026-10-18T00:00:00Z',source:'USDataMap directory',source_url:'https://usdatamap.com/',counts:{construction:1,planned:1},records:[{id:'build',name:'New campus',company:'B',stateCode:'IN',status:'construction'},{id:'plan',name:'Future campus',company:'C',stateCode:'NM',status:'planned'}]};
test('requires reconciled, dated, distinct, bounded directory records',()=>{
 assert.equal(P.valid(catalog),true);
 for(const bad of [{...catalog,counts:{construction:2,planned:1}},{...catalog,observed_at:'2099-01-01'},{...catalog,records:[catalog.records[0],catalog.records[0]]},{...catalog,records:[{...catalog.records[0],status:'operating'},catalog.records[1]]}])assert.equal(P.valid(bad),false);
});
test('filters by phase, state and literal name/operator search without inventing coverage',()=>{
 assert.deepEqual(P.filter(catalog.records,{phase:'construction',state:'IN',search:'new'}).map(r=>r.id),['build']);
 assert.equal(P.filter(catalog.records,{phase:'construction',state:'NM'}).length,0);
 assert.equal(P.filter(catalog.records,{phase:'all',state:'PR'}).length,0);
 assert.deepEqual(P.filter(catalog.records,{phase:'planned',state:'all',search:' c '}).map(r=>r.id),['plan']);
});
const fs=require('node:fs'),{JSDOM}=require('../work/citizen-test/node_modules/jsdom');
async function ui(){
 const d=new JSDOM('<main><section id="view-citizen"></section></main>',{runScripts:'outside-only',url:'https://example.test/'});
 d.window.HTMLElement.prototype.scrollIntoView=()=>{};
 d.window.fetch=async url=>({ok:!url.startsWith('https:'),json:async()=>catalog});
 for(const file of ['citizen-model.js','citizen.js','citizen-projects.js'])d.window.eval(fs.readFileSync('site/'+file,'utf8'));
 await new Promise(r=>setTimeout(r,0));
 const doc=d.window.document,get=id=>doc.getElementById(id),click=s=>doc.querySelector(s).click();
 const change=(id,value)=>{get(id).value=value;get(id).dispatchEvent(new d.window.Event('change',{bubbles:true}));};
 const input=(id,value)=>{get(id).value=value;get(id).dispatchEvent(new d.window.Event('input',{bubbles:true}));};
 return{d,doc,get,click,change,input};
}
test('named picker fills a generic project, separates phases, clears recipients, and preserves edited letters',async()=>{
 const {d,doc,get,click,change,input}=await ui();
 assert.equal(get('citizen-project-select').querySelectorAll('option[value^="directory:"]').length,1);
 change('citizen-project-select','directory:build');
 assert.equal(get('citizen-scope').value,'other');assert.equal(get('citizen-project-name').value,'B · New campus');assert.equal(get('citizen-place').value,'IN');assert.equal(get('citizen-jasper').hidden,true);
 click('[data-step="1"]');click('[value="baseline"]');click('[data-step="2"]');input('citizen-recipient-air','Old project agency');click('[data-step="3"]');
 assert.match(get('citizen-draft').value,/B · New campus/);assert.doesNotMatch(get('citizen-draft').value,/384|50413|PJackso|November 16/);
 input('citizen-draft','Keep my edited letter.');click('[data-step="0"]');change('citizen-project-phase','planned');change('citizen-project-select','directory:plan');
 assert.equal(get('citizen-project-name').value,'C · Future campus');assert.match(get('citizen-directory-choice').textContent,/Reported planned/);
 click('[data-step="2"]');assert.equal(get('citizen-recipient-air').value,'');click('[data-step="3"]');
 assert.equal(get('citizen-rebuild').hidden,false);assert.equal(get('citizen-draft').value,'Keep my edited letter.');
 click('#citizen-replace');assert.match(get('citizen-draft').value,/C · Future campus/);assert.doesNotMatch(get('citizen-draft').value,/Old project agency/);
 click('[data-step="0"]');change('citizen-project-state','PR');assert.match(get('citizen-project-matches').textContent,/No directory matches/);assert.equal(get('citizen-project-select').value,'directory:plan');
 click('#citizen-clear');click('#citizen-clear');assert.equal(get('citizen-project-select').value,'jasper');assert.equal(get('citizen-project-phase').value,'construction');assert.equal(get('citizen-directory-choice').hidden,true);
 d.window.close();
});
test('refreshes leave selected projects and personal text intact; source failures preserve the usable roster',async()=>{
 const {d,get,click,change,input}=await ui();change('citizen-project-select','directory:build');input('citizen-project-name','My corrected project name');input('citizen-place','Specific county');
 const updated={...catalog,observed_at:'2026-10-18T01:00:00Z',records:catalog.records.map(r=>({...r,name:r.name+' refreshed'}))};
 d.window.fetch=async()=>({ok:true,json:async()=>updated});click('#citizen-project-refresh');await new Promise(r=>setTimeout(r,0));
 assert.equal(get('citizen-project-select').value,'directory:build');assert.equal(get('citizen-project-name').value,'My corrected project name');assert.equal(get('citizen-place').value,'Specific county');
 d.window.fetch=async()=>{throw Error('offline')};click('#citizen-project-refresh');await new Promise(r=>setTimeout(r,0));
 assert.match(get('citizen-project-freshness').textContent,/saved snapshot/);assert.equal(get('citizen-project-select').value,'directory:build');
 d.window.close();
});
test('the saved roster reconciles with its dated headline snapshot',()=>{
 const data=JSON.parse(fs.readFileSync('site/data-center-projects.json'));
 const snapshot=JSON.parse(fs.readFileSync('site/data-center-counts.json')).snapshots.find(r=>r.observed_at===data.observed_at);
 assert.equal(P.valid(data),true);assert.ok(snapshot);assert.equal(data.counts.construction,snapshot.under_construction);assert.equal(data.counts.planned,snapshot.planned);
});
