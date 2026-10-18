const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
function setup(){
 const dom=new JSDOM('<div id="nm-follow-dollar"></div>',{url:'https://example.test/#nearby',runScripts:'outside-only'});
 for(const file of ['follow-dollar-model.js','follow-dollar.js'])dom.window.eval(fs.readFileSync('site/'+file,'utf8'));
 return {dom,d:dom.window.document,w:dom.window};
}
test('agreement controls change the correct recipient and retain unknown health costs',()=>{
 const {dom,d,w}=setup();try{
  assert.equal(d.querySelector('#follow-dollar').open,false);
  assert.equal(d.querySelector('#fd-tax').textContent,'$75M');
  d.querySelector('[data-fd-relief="0"]').click();
  assert.equal(d.querySelector('#fd-tax').textContent,'$100M');
  d.querySelector('[data-fd-share="100"]').click();
  assert.equal(d.querySelector('#fd-others').textContent,'$0');
  const check=d.querySelector('#fd-monitor');check.checked=true;check.dispatchEvent(new w.Event('change'));
  assert.equal(d.querySelector('#fd-monitoring').textContent,'$5M');
  assert.equal(d.querySelector('#fd-health').textContent,'Unknown');
  assert.match(d.querySelector('#fd-receipt').textContent,/\$205M/);
  d.querySelector('#fd-reset').click();
  assert.equal(d.querySelector('#fd-tax').textContent,'$75M');
  assert.equal(d.querySelector('#fd-others').textContent,'$50M');
  assert.equal(check.checked,false);
 }finally{dom.window.close();}
});
test('a wrong answer explains the distinction and allows a new attempt, then replay clears it',()=>{
 const {dom,d}=setup();try{
  d.querySelector('[data-fd-answer="monitoring"]').click();
  assert.equal(d.querySelector('#fd-feedback').dataset.correct,'false');
  d.querySelector('[data-fd-answer="health"]').click();
  assert.equal(d.querySelector('#fd-feedback').dataset.correct,'true');
  assert.equal(d.querySelector('#fd-takeaway').hidden,false);
  d.querySelector('#fd-reset').click();
  assert.equal(d.querySelector('#fd-feedback').hidden,true);
  assert.equal(d.querySelector('#fd-takeaway').hidden,true);
 }finally{dom.window.close();}
});
