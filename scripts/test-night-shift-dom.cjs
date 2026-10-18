const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
function setup(){
  const dom=new JSDOM('<div id="nm-night-shift"></div>',{url:'https://example.test/#nearby',runScripts:'outside-only'});
  for(const name of ['night-shift-model.js','night-shift.js'])if(fs.existsSync('site/'+name))dom.window.eval(fs.readFileSync('site/'+name,'utf8'));
  return {dom,d:dom.window.document,w:dom.window};
}
test('daylight scheduling updates emissions while preserving full demand, then reset restores the starting plan',()=>{
 const {dom,d}=setup();try{
  assert.ok(d.querySelector('#ns-daylight'),'The game needs a daylight scheduling action');
  assert.equal(d.querySelector('#night-shift').open,false);
  assert.equal(d.querySelector('#ns-carbon').textContent,'69.0');
  d.querySelector('#ns-daylight').click();
  assert.equal(d.querySelector('#ns-carbon').textContent,'25.8');
  assert.equal(d.querySelector('#ns-essential').textContent,'100%');
  assert.equal(d.querySelector('#ns-batch').textContent,'100%');
  assert.equal(d.querySelector('[data-ns-slot="1"]').getAttribute('aria-pressed'),'true');
  d.querySelector('#ns-reset').click();
  assert.equal(d.querySelector('#ns-carbon').textContent,'69.0');
  assert.equal(d.querySelector('[data-ns-slot="2"]').getAttribute('aria-pressed'),'true');
 }finally{dom.window.close();}
});
test('removing grid supply cannot label an incomplete cloudy plan as success',()=>{
 const {dom,d,w}=setup();try{
  assert.ok(d.querySelector('#ns-weather'));
  d.querySelector('#ns-weather').value='cloudy';d.querySelector('#ns-weather').dispatchEvent(new w.Event('change'));
  d.querySelector('#ns-grid').checked=false;d.querySelector('#ns-grid').dispatchEvent(new w.Event('change'));
  assert.equal(d.querySelector('#ns-outcome').dataset.complete,'false');
  assert.notEqual(d.querySelector('#ns-essential').textContent,'100%');
  assert.notEqual(d.querySelector('#ns-batch').textContent,'100%');
  assert.match(d.querySelector('#ns-outcome').textContent,/unmet/i);
  assert.equal(d.querySelectorAll('.ns-period').length,4);
 }finally{dom.window.close();}
});
