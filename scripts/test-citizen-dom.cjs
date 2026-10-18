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
test('spoken drafts stay with their office, preserve edits, and require explicit replacement',()=>{
 const {d,get,click,input,change}=setup();
 click('[data-step="1"]');click('[value="baseline"]');click('[value="startup"]');click('[value="noise"]');click('[data-step="3"]');
 click('#citizen-speech-build');assert.match(get('citizen-speech').value,/384/);assert.doesNotMatch(get('citizen-speech').value,/sound study/);
 input('citizen-speech','My own spoken words.');click('#citizen-speech-build');
 assert.equal(get('citizen-speech-rebuild').hidden,false);assert.equal(get('citizen-speech').value,'My own spoken words.');
 click('#citizen-speech-keep');change('citizen-letter','1');assert.equal(get('citizen-speech').value,'');
 click('#citizen-speech-build');assert.match(get('citizen-speech').value,/sound study/);assert.doesNotMatch(get('citizen-speech').value,/384/);
 change('citizen-letter','0');assert.equal(get('citizen-speech').value,'My own spoken words.');
 click('#citizen-speech-build');click('#citizen-speech-replace');assert.match(get('citizen-speech').value,/384/);
 // Speech edits must also survive changed letter selections until explicit replacement.
 input('citizen-speech','Keep this speech.');click('[data-step="1"]');click('[value="health"]');click('[data-step="3"]');
 assert.equal(get('citizen-rebuild').hidden,false);assert.equal(get('citizen-speech').value,'Keep this speech.');
 click('#citizen-keep');click('#citizen-clear');click('#citizen-clear');assert.equal(get('citizen-speech').value,'');
 d.window.close();
});
test('record collection is separate from compliance and resets for another project',()=>{
 const {d,doc,get,click,input,change}=setup();
 assert.match(get('citizen-doc-progress').textContent,/0 of 7/);
 click('[name="citizen-document"]');assert.match(get('citizen-doc-progress').textContent,/1 of 7/);
 change('citizen-scope','other');assert.match(get('citizen-doc-progress').textContent,/0 of 7/);
 input('citizen-project-name','A different project');change('citizen-kind','records');
 click('[data-step="1"]');click('[value="baseline"]');click('[data-step="3"]');
 assert.equal(get('citizen-speech-tool').hidden,true);
 assert.equal(doc.querySelectorAll('.citizen-evidence-verified').length,0);
 d.window.close();
});
test('spoken point selection rejects a fourth point and does not replace edited text',()=>{
 const {d,doc,get,click,input}=setup();
 click('[data-step="1"]');for(const id of ['particles','startup','testing','emergency'])click('[name="citizen-topic"][value="'+id+'"]');click('[data-step="3"]');
 click('#citizen-speech-build');input('citizen-speech','Words I want to keep.');
 click('[name="citizen-speech-point"][value="emergency"]');
 assert.equal(doc.querySelectorAll('[name="citizen-speech-point"]:checked').length,3);
 assert.match(get('citizen-speech-choice-status').textContent,/Uncheck/);
 click('[name="citizen-speech-point"][value="particles"]');click('[name="citizen-speech-point"][value="emergency"]');
 assert.equal(get('citizen-speech').value,'Words I want to keep.');
 click('#citizen-speech-build');click('#citizen-speech-replace');
 assert.match(get('citizen-speech').value,/100 hours/);assert.doesNotMatch(get('citizen-speech').value,/Particles & filter performance/);
 d.window.close();
});
