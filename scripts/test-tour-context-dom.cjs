'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
async function setup(fail=false){
 const dom=new JSDOM('<main><section id="view-impact"></section></main>',{url:'https://example.test/#tours',runScripts:'outside-only'}),w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.view=id=>{w.document.body.dataset.view=id;};w.Blob=Blob;
 let blob;w.URL.createObjectURL=value=>{blob=value;return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 w.fetch=async()=>{if(fail)throw Error('offline');return{ok:true,json:async()=>JSON.parse(fs.readFileSync('site/ballot-measures.json','utf8'))};};
 w.eval(['tour-model.js','community-tours.js','tour-context-model.js','tour-context.js'].map(f=>fs.readFileSync('site/'+f,'utf8')).join('\n'));
 await new Promise(r=>setImmediate(r));return{dom,w,d:w.document,blob:()=>blob};
}
const stop=(name,city)=>({name,address:'100 Main Street, '+city+', CA 91801',city,state:'CA',phase:'Current operation not verified',source:'https://example.org/public-address',note:''});
test('a tour has one cohesive election story and local records only for its address city',async()=>{
 const {dom,w,d}=await setup();try{
  await w.CommunityTours.add(stop('Public place','Alhambra'));await w.CommunityTours.add(stop('Other public place','Los Angeles'));
  assert.equal(d.querySelector('#ct-selected-tour').hidden,false);assert.equal(d.querySelectorAll('#ct-civic-prompts li').length,3);
  assert.match(d.querySelector('#ct-civic-story').textContent,/46 of 47/);assert.match(d.querySelector('#ct-civic-story').textContent,/National context, not a result for this route/);
  const local=d.querySelector('#ct-civic-local');assert.equal(local.querySelectorAll('article').length,1);assert.match(local.textContent,/Alhambra/);assert.doesNotMatch(local.textContent,/Monterey Park/);assert.match(local.textContent,/Confirm municipal boundaries/);
  assert.equal(d.querySelector('.ct-civic-records').open,false);assert.ok(d.querySelector('.ct-stop>.ct-phase'));
 }finally{dom.window.close();}
});
test('lens questions and legal-source context travel with downloaded notes, without broadcasting personal notes',async()=>{
 const {dom,w,d,blob}=await setup();try{
  let payload;w.addEventListener('footprint:tour-change',ev=>payload=ev.detail);
  await w.CommunityTours.add(stop('Public place','Alhambra'));
  const note=d.querySelector('[data-note]');note.value='My literal <unverified observation>.';note.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert.ok(!Object.hasOwn(w.CommunityTours.getContext()[0],'note'));assert.ok(!JSON.stringify(payload).includes('unverified observation'));
  d.querySelector('[data-tour-lens="health"]').click();assert.match(d.querySelector('#ct-civic-prompts').textContent,/monitoring records/);
  d.querySelector('#ct-export').click();const text=await blob().text();assert.match(text,/Lens: health/);assert.match(text,/My literal <unverified observation>/);assert.match(text,/Legal effect:/);assert.match(text,/verify municipal boundary/i);
  assert.equal(w.localStorage.getItem('footprint-community-tour-v1'),null);
 }finally{dom.window.close();}
});
test('missing local data remains unknown while the route and field notes stay usable',async()=>{
 const {dom,w,d}=await setup(true);try{
  await w.CommunityTours.add(stop('Unknown public place','Beverly Hills'));
  assert.match(d.querySelector('#ct-civic-local').textContent,/could not load/);assert.match(d.querySelector('#ct-civic-local').textContent,/No local policy conclusion/);assert.equal(d.querySelector('#ct-count').textContent,'1');assert.equal(d.querySelector('#ct-export').disabled,false);
 }finally{dom.window.close();}
});
test('local result details expose the supporting outcome record as well as ballot text',async()=>{
 const {dom,w,d}=await setup();try{
  await w.CommunityTours.add({name:'Public place',address:'100 Main Street, Boulder City, NV 89005',city:'Boulder City',state:'NV',source:'https://example.org/public-address'});
  const links=[...d.querySelectorAll('#ct-civic-local a')].map(a=>a.href);assert.ok(links.some(url=>url.includes('primegov.com')));assert.ok(links.length>1);
 }finally{dom.window.close();}
});
