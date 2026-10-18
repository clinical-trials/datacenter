const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
function setup(){
 const d=new JSDOM('<main><section id="view-citizen"></section></main>',{runScripts:'outside-only',url:'https://example.test/'});
 d.window.HTMLElement.prototype.scrollIntoView=()=>{};
 d.window.eval(fs.readFileSync('site/citizen-model.js','utf8'));
 d.window.eval(fs.readFileSync('site/citizen.js','utf8'));
 const doc=d.window.document;
 return {d,doc,get:id=>doc.getElementById(id),click:s=>doc.querySelector(s).click(),input:(id,v)=>{doc.getElementById(id).value=v;doc.getElementById(id).dispatchEvent(new d.window.Event('input',{bubbles:true}));},change:(id,v)=>{doc.getElementById(id).value=v;doc.getElementById(id).dispatchEvent(new d.window.Event('change',{bubbles:true}));}};
}
test('four-step flow separates letters and preserves edits through route changes',()=>{
 const {d,doc,get,click,input,change}=setup();
 click('[data-step="1"]');assert.equal(doc.querySelector('[data-panel="1"]').hidden,false);
 click('[value="baseline"]');click('[value="noise"]');click('#citizen-next');click('#citizen-next');
 assert.equal(get('citizen-letter').options.length,2);assert.match(get('citizen-draft').value,/Phillip Jackson/);
 input('citizen-draft','My edited letter.');change('citizen-letter','1');assert.match(get('citizen-draft').value,/Planning/);
 change('citizen-letter','0');assert.equal(get('citizen-draft').value,'My edited letter.');
 click('[data-step="1"]');click('[value="health"]');click('[data-step="3"]');
 assert.equal(get('citizen-rebuild').hidden,false);assert.equal(get('citizen-draft').value,'My edited letter.');
 click('#citizen-keep');assert.equal(get('citizen-draft').value,'My edited letter.');
 click('[data-step="1"]');click('[data-step="3"]');click('#citizen-replace');
 assert.equal(get('citizen-letter').options.length,3);assert.match(get('citizen-draft').value,/Phillip Jackson/);
 d.window.close();
});
test('other-community records flow keeps local recipients, omits Indiana claims and treats input literally',()=>{
 const {d,doc,get,click,input,change}=setup();
 change('citizen-scope','other');input('citizen-project-name','Example NM project');input('citizen-place','New Mexico');change('citizen-kind','records');
 click('[data-step="1"]');click('[value="baseline"]');click('[data-step="2"]');
 assert.equal(get('citizen-position-wrap').hidden,true);
 input('citizen-recipient-air','Example agency');input('citizen-note','<img src=x onerror=alert(1)>');click('[data-step="3"]');
 const text=get('citizen-draft').value;assert.match(text,/Example agency/);assert.match(text,/existing records/);assert.doesNotMatch(text,/50413|384|Jasper|PJackso/);
 assert.ok(text.includes('<img src=x onerror=alert(1)>'));assert.equal(doc.querySelectorAll('img').length,0);
 click('#citizen-clear');assert.ok(get('citizen-draft').value);click('#citizen-clear');assert.equal(get('citizen-draft').value,'');assert.equal(get('citizen-note').value,'');
 d.window.close();
});
