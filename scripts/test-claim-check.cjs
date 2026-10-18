const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
function setup(){
  const dom=new JSDOM('<div id="nm-claim-check"></div>',{url:'https://example.test/#nearby',runScripts:'outside-only'});
  dom.window.HTMLElement.prototype.scrollIntoView=function(){};
  if(fs.existsSync('site/claim-check.js'))dom.window.eval(fs.readFileSync('site/claim-check.js','utf8'));
  return {dom,d:dom.window.document};
}
// Catches a skipped round, double-counted answer, or feedback missing its evidence.
test('one choice reveals evidence and locks the round until Next',()=>{
  const {dom,d}=setup();
  try{
    assert.ok(d.querySelector('[data-answer]'),'Claim Check should provide answer choices');
    assert.equal(d.querySelector('#claim-check').open,false);
    assert.equal(d.querySelector('#cc-feedback').hidden,true);
    d.querySelector('[data-answer="0"]').click();
    assert.equal(d.querySelector('#cc-feedback').hidden,false);
    assert.equal(d.querySelectorAll('[data-answer]:disabled').length,3);
    assert.equal(d.querySelector('#cc-feedback a').hostname,'www.epa.gov');
    d.querySelector('[data-answer="1"]').click();
    assert.match(d.querySelector('#cc-progress').textContent,/1.*3/);
    d.querySelector('#cc-next').click();
    assert.match(d.querySelector('#cc-progress').textContent,/2.*3/);
    assert.equal(d.querySelector('#cc-feedback').hidden,true);
    assert.equal(d.querySelectorAll('[data-answer]:disabled').length,0);
  }finally{dom.window.close();}
});
// Catches misleading whole-facility savings or efficiency-as-total-water conclusions.
test('the numeric examples reveal 8 percent energy savings and 25 percent higher water use',()=>{
  const {dom,d}=setup();
  try{
    assert.ok(d.querySelector('[data-answer]'));
    d.querySelector('[data-answer="1"]').click();d.querySelector('#cc-next').click();
    d.querySelector('[data-answer="0"]').click();
    assert.match(d.querySelector('#cc-feedback').textContent,/8%/);
    assert.match(d.querySelector('#cc-feedback').textContent,/92/);
    d.querySelector('#cc-next').click();d.querySelector('[data-answer="2"]').click();
    assert.match(d.querySelector('#cc-feedback').textContent,/25%/);
    assert.match(d.querySelector('#cc-feedback').textContent,/10 million liters/);
    d.querySelector('#cc-next').click();
    assert.equal(d.querySelectorAll('.cc-takeaways li').length,3);
    assert.equal(d.querySelector('[data-view="citizen"]').getAttribute('href'),'#citizen');
  }finally{dom.window.close();}
});
// Catches a dead-end copy action on unsupported browsers or stale state on replay.
test('copy has a selectable fallback and replay clears the completed round',async()=>{
  const {dom,d}=setup();
  try{
    assert.ok(d.querySelector('[data-answer]'));
    for(let i=0;i<3;i++){d.querySelector('[data-answer="0"]').click();d.querySelector('#cc-next').click();}
    d.querySelector('#cc-copy').click();await new Promise(resolve=>setImmediate(resolve));
    assert.equal(d.querySelector('#cc-copy-text').hidden,false);
    assert.match(d.querySelector('#cc-copy-text').value,/hourly/i);
    assert.match(d.querySelector('#cc-copy-text').value,/water/i);
    d.querySelector('#cc-replay').click();
    assert.match(d.querySelector('#cc-progress').textContent,/1.*3/);
    assert.equal(d.querySelector('#cc-feedback').hidden,true);
    assert.equal(d.querySelectorAll('[data-answer]:disabled').length,0);
  }finally{dom.window.close();}
});
