'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');
async function setup({fail=false,blocked=false,url='https://example.test/?review=test#deadlines'}={}){
 const dom=new JSDOM(fs.readFileSync('site/index.html','utf8'),{url,runScripts:'outside-only'}),w=dom.window;
 const RealDate=w.Date;let instant=Date.parse('2026-11-18T22:00:00Z');
 w.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[instant]));}static now(){return instant;}};
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.Blob=Blob;
 let captured=null;w.URL.createObjectURL=blob=>{captured=blob;return 'blob:calendar-test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
 if(blocked)w.Storage.prototype.setItem=()=>{throw Error('Blocked');};
 w.fetch=async url=>{if(fail&&String(url)==='deadline-events.json')throw Error('offline');const name=String(url).split('/').pop().split('?')[0];return{ok:true,json:async()=>JSON.parse(fs.readFileSync('site/'+name,'utf8'))};};
 w.eval(['app.js','citizen-model.js','citizen.js','citizen-projects.js','deadline-calendar-model.js','deadline-calendar.js'].map(n=>fs.readFileSync('site/'+n,'utf8')).join('\n'));
 await new Promise(r=>setImmediate(r));
 return{dom,w,d:w.document,blob:()=>captured,tick:time=>{instant=Date.parse(time);}};
}
test('only future checked notices offer calendar exports; extensions and unknown clocks stay explicit',async()=>{
 const {dom,d}=await setup();try{
  assert.equal(d.body.dataset.view,'deadlines');assert.equal(d.querySelectorAll('#dc-upcoming .dc-card').length,4);
  assert.equal(d.querySelectorAll('#dc-past .dc-card').length,2);assert.equal(d.querySelectorAll('#dc-past [data-dc-download]').length,0);
  const nj=d.querySelector('[data-event-id="nj-fair-share-comments"]');assert.match(nj.textContent,/November 13, 2026/);assert.match(nj.textContent,/December 14, 2026/);assert.match(nj.textContent,/Neither notice explicitly names the time zone/);
  const g=new URL(nj.querySelector('[data-dc-google]').href);assert.equal(g.searchParams.get('dates'),'20261214/20261215');assert.match(g.searchParams.get('details'),/proceeding=nj-fair-share-comments/);
  assert.match(d.querySelector('#dc-past').textContent,/final decision not verified/);
 }finally{dom.window.close();}
});
test('download includes selected future dates, advance alarms and preparation links without sending',async()=>{
 const {dom,d,w,blob}=await setup();try{
  const select=d.querySelector('[data-dc-select="in-amazon-hobart-comments"]');select.checked=false;select.dispatchEvent(new w.Event('change',{bubbles:true}));
  d.querySelector('#dc-download-selected').click();const text=await blob().text();
  assert.equal((text.match(/^BEGIN:VEVENT/gm)||[]).length,6);assert.ok(text.includes('CATEGORIES:PERSONAL PREPARATION'));assert.match(text,/TRIGGER:-P7D/);assert.match(text,/TRIGGER:-P1D/);assert.doesNotMatch(text,/TRIGGER:-PT2H|ATTENDEE|ORGANIZER|ACTION:EMAIL/);
  assert.match(text.replace(/\r\n /g,''),/prepare=records#citizen/);assert.doesNotMatch(text,/DTSTART;VALUE=DATE:20261116/);
  assert.match(d.querySelector('#dc-action-status').textContent,/one-time copy; nothing was submitted/);
 }finally{dom.window.close();}
});
test('calendar handoff selects the actual proceeding and preserves existing edited letters',async()=>{
 const {dom,d,w}=await setup();try{
  d.querySelector('#view-citizen [data-step="1"]').click();d.querySelector('[name="citizen-topic"][value="baseline"]').click();d.querySelector('#view-citizen [data-step="3"]').click();
  const draft=d.querySelector('#citizen-draft');draft.value='Keep my edited letter.';draft.dispatchEvent(new w.Event('input'));
  d.querySelector('[data-dc-prepare="nj-fair-share-comments"]').click();assert.equal(d.body.dataset.view,'citizen');
  d.querySelector('#dc-use-project').click();assert.equal(d.querySelector('#citizen-scope').value,'other');assert.equal(d.querySelector('#citizen-project-select').value,'other');
  assert.equal(d.querySelector('#citizen-project-name').value,'Data Center Fair Share Act implementation');assert.equal(d.querySelector('#citizen-permit').value,'EO26080463');assert.equal(d.querySelector('#citizen-jasper').hidden,true);
  assert.equal(draft.value,'Keep my edited letter.');assert.equal(d.querySelector('#dc-wizard-context').hidden,false);
  d.querySelector('#view-citizen [data-step="3"]').click();assert.equal(d.querySelector('#citizen-rebuild').hidden,false);assert.equal(draft.value,'Keep my edited letter.');
  d.querySelector('#citizen-project-select').value='jasper';d.querySelector('#citizen-project-select').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(d.querySelector('#dc-wizard-context').hidden,true);
 }finally{dom.window.close();}
});
test('deep links are consumed once and a refresh does not drag the user back into the wizard',async()=>{
 const {dom,d,w}=await setup({url:'https://example.test/?proceeding=nj-fair-share-comments&prepare=records#citizen'});try{
  assert.equal(d.body.dataset.view,'citizen');assert.equal(d.querySelector('#dc-wizard-context').hidden,false);
  d.querySelector('#dc-wizard-context [data-view="deadlines"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(d.body.dataset.view,'deadlines');
  d.querySelector('#dc-refresh').click();await new Promise(r=>setImmediate(r));assert.equal(d.body.dataset.view,'deadlines');
  const el=d.querySelector('[data-dc-step]');el.checked=true;el.dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(w.localStorage.getItem('footprint-deadline-steps-v1'),/notice/);
 }finally{dom.window.close();}
});
test('failed source loading cannot fabricate upcoming dates, and blocked storage is explicit',async()=>{
 const a=await setup({fail:true});try{assert.equal(a.d.querySelectorAll('#dc-upcoming .dc-card').length,0);assert.equal(a.d.querySelector('#dc-download-selected').disabled,true);assert.match(a.d.querySelector('#dc-load-status').textContent,/unavailable/);}finally{a.dom.window.close();}
 const b=await setup({blocked:true});try{const el=b.d.querySelector('[data-dc-step]');el.checked=true;el.dispatchEvent(new b.w.Event('change',{bubbles:true}));assert.match(b.d.querySelector('#dc-action-status').textContent,/session only/);}finally{b.dom.window.close();}
});
test('Google export reassesses a date that expires while the page remains open',async()=>{
 const {dom,d,w,tick}=await setup();try{
  const link=d.querySelector('[data-dc-google="in-microsoft-lpo-comments"]');tick('2026-11-28T20:00:00Z');const ev=new w.MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(ev);
  assert.equal(ev.defaultPrevented,true);assert.match(d.querySelector('#dc-action-status').textContent,/no longer eligible/);assert.equal(d.querySelector('[data-dc-google="in-microsoft-lpo-comments"]'),null);
 }finally{dom.window.close();}
});
test('earlier personal target skips known agency closures and stores only a sender role',async()=>{
 const {dom,d,w,blob}=await setup();try{
  const card=d.querySelector('[data-event-id="in-microsoft-lpo-comments"]');assert.match(card.querySelector('.dc-send-plan').textContent,/November 23, 2026/);
  const owner=card.querySelector('[data-dc-owner]');owner.value='me';owner.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.deepEqual(JSON.parse(w.localStorage.getItem('footprint-deadline-steps-v1')),{'in-microsoft-lpo-comments:0':{owner:'me'}});
  card.querySelector('[data-dc-target]').click();const text=await blob().text();assert.equal((text.match(/^BEGIN:VEVENT/gm)||[]).length,1);assert.match(text,/DTSTART;VALUE=DATE:20261123/);assert.doesNotMatch(text,/DTSTART;VALUE=DATE:20261128/);assert.match(text,/not an official/);
 }finally{dom.window.close();}
});
test('short-comment templates use the selected record, flag late requests and preserve edits',async()=>{
 const {dom,d,w}=await setup();try{
  d.querySelector('[data-dc-prepare="nj-fair-share-comments"]').click();d.querySelector('#dc-short-build').click();
  const field=d.querySelector('#dc-short-text');assert.match(field.value,/EO26080463/);assert.match(field.value,/one specific issue/);assert.doesNotMatch(field.value,/50413|no permit issued/);
  field.value='My careful short comment.';field.dispatchEvent(new w.Event('input'));d.querySelector('#dc-short-build').click();assert.equal(field.value,'My careful short comment.');assert.match(d.querySelector('#dc-short-status').textContent,/kept/);
  d.querySelector('#dc-short-build').click();assert.match(field.value,/EO26080463/);
  d.querySelector('[data-dc-prepare="in-jasper-comments"]').click();d.querySelector('#dc-short-build').click();assert.match(field.value,/date has passed/);assert.match(field.value,/whether these comments can still be considered/);assert.doesNotMatch(field.value,/no permit issued|preserve.*standing/);
  assert.match(d.querySelector('#dc-send-habits').textContent,/does not automatically preserve standing/);
 }finally{dom.window.close();}
});
test('manual project edits detach calendar context, and resetting clears the short draft',async()=>{
 const {dom,d,w}=await setup();try{
  d.querySelector('[data-dc-prepare="nj-fair-share-comments"]').click();d.querySelector('#dc-use-project').click();
  const name=d.querySelector('#citizen-project-name');name.value='My different project';name.dispatchEvent(new w.Event('input'));
  const permit=d.querySelector('#citizen-permit');permit.value='MY-DOCKET';permit.dispatchEvent(new w.Event('input'));
  assert.equal(d.querySelector('#dc-wizard-context').hidden,true);d.querySelector('#dc-short-build').click();assert.match(d.querySelector('#dc-short-text').value,/My different project/);assert.match(d.querySelector('#dc-short-text').value,/MY-DOCKET/);assert.doesNotMatch(d.querySelector('#dc-short-text').value,/EO26080463/);
  const text=d.querySelector('#dc-short-text');text.value='Edited short draft.';text.dispatchEvent(new w.Event('input'));
  const unload=new w.Event('beforeunload',{cancelable:true});w.dispatchEvent(unload);assert.equal(unload.defaultPrevented,true);
  d.querySelector('#citizen-clear').click();assert.equal(text.value,'Edited short draft.');d.querySelector('#citizen-clear').click();assert.equal(text.value,'');assert.equal(d.querySelector('#dc-short-output').hidden,true);
 }finally{dom.window.close();}
});
test('a listed date today with unknown cutoff is not called a missed deadline',async()=>{
 const {dom,d,tick}=await setup();try{
  tick('2026-11-28T16:00:00Z');d.querySelector('[data-dc-prepare="in-microsoft-lpo-comments"]').click();d.querySelector('#dc-short-build').click();
  assert.match(d.querySelector('#dc-short-context').textContent,/date is today/);assert.doesNotMatch(d.querySelector('#dc-short-text').value,/date has passed/);
  assert.match(d.querySelector('#dc-wizard-context').textContent,/Listed date reached/);
 }finally{dom.window.close();}
});
