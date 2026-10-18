const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../site/public-events.js');
const now=new Date('2026-10-18T18:00:00Z');
test('verified hearing access includes a phone, conference code, source and timezone',()=>{
 const e=E.events.find(e=>e.id==='amazon-hearing'),html=E.card(e,now),copy=E.callDetails(e);
 assert.match(html,/href="tel:\+13175521674"/);assert.match(html,/141 723 194#/);assert.match(html,/Copy call details/);
 assert.match(copy,/141723194#/);assert.match(copy,/CST/);assert.match(copy,/2026/);assert.match(copy,/50413ph-cm/);
});
test('committee listings without confirmed phone access do not turn contact numbers into dial-ins',()=>{
 const e=E.events.find(e=>e.id==='homer'),html=E.card(e,now);
 assert.match(html,/Phone participation not verified/);assert.doesNotMatch(html,/href="tel:/);
 assert.match(html,/717-783-7753/);assert.doesNotMatch(html,/141 723 194/);
 const future={...e,id:'next-meeting',date:'2026-11-02',start:'2026-11-02T18:00:00-05:00',end:null};
 assert.match(E.card(future,now),/Phone participation not verified/);
});
test('shared template handles a different verified hearing without inheriting Indiana access details',()=>{
 const other={...E.events[0],id:'example',date:'2026-11-02',start:'2026-11-02T18:00:00-05:00',access:{phone:'+12025550123',phoneDisplay:'+1 (202) 555-0123',conferenceId:'123456#',conferenceDisplay:'123 456#',sourceUrl:'https://example.gov/notice',checked:'2026-10-18',speakerInstructions:'Register through the notice.'}};
 const html=E.card(other,now);assert.match(html,/tel:\+12025550123/);assert.match(html,/123 456#/);assert.doesNotMatch(html,/317|141723194|141 723 194/);
 const unknown=E.card({...other,access:{...other.access,phone:'javascript:alert(1)'}},now);assert.doesNotMatch(unknown,/href="tel:|javascript:/);
 const noCode=E.card({...other,access:{...other.access,conferenceId:null,conferenceDisplay:null}},now);assert.match(noCode,/Conference ID not verified/);
 const archived=E.card(other,new Date('2026-12-01T00:00:00Z'));assert.doesNotMatch(archived,/href="tel:/);
});
test('event-list copy control includes complete access and offers manual copy on failure',async()=>{
 const {JSDOM}=require('../work/citizen-test/node_modules/jsdom'),fs=require('node:fs');
 const d=new JSDOM('<div id="public-events-list"></div><details id="public-events-past"><div id="public-events-archive"></div></details>',{runScripts:'outside-only'});
 const DateClass=d.window.Date;d.window.Date=class extends DateClass{constructor(...args){super(...(args.length?args:['2026-10-18T18:00:00Z']));}};
 let copied='';d.window.navigator.clipboard={writeText:async text=>{copied=text;}};
 d.window.eval(fs.readFileSync('site/public-events.js','utf8'));
 const button=d.window.document.querySelector('[data-event-copy="amazon-hearing"]');await button.onclick();
 assert.match(copied,/\+13175521674/);assert.match(copied,/141723194#/);assert.match(copied,/Speaker Form/);
 d.window.navigator.clipboard={writeText:async()=>{throw Error('blocked');}};await button.onclick();
 const fallback=d.window.document.querySelector('.event-copy-fallback');assert.equal(fallback.hidden,false);assert.equal(fallback.value,copied);
 d.window.close();
});
