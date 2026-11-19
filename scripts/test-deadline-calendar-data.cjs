'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const M=require('../site/deadline-calendar-model.js');
const data=JSON.parse(fs.readFileSync('site/deadline-events.json','utf8'));
test('published dates retain official source, authored revision and known uncertainty',()=>{
 const ids=new Set(),uids=new Set();
 for(const r of data.events){const n=M.normalizeEvent(r);assert.equal(n.valid,true,n.errors.join(' '));assert.ok(r.updated);assert.ok(r.phase);assert.ok(!ids.has(r.id));assert.ok(!uids.has(M.uidFor(r)));ids.add(r.id);uids.add(M.uidFor(r));}
 assert.equal(M.eligibleEvents(data.events,{now:data.updated}).length,4);
 const nj=data.events.find(r=>r.id==='nj-fair-share-comments');assert.equal(nj.date,'2026-12-14');assert.equal(nj.history[0].date,'2026-11-13');assert.equal(nj.sequence,1);assert.ok(!nj.start);
 for(const id of ['in-microsoft-lpo-comments','in-amazon-hobart-comments']){const r=data.events.find(x=>x.id===id);assert.match(r.cutoffNote,/next business day/);assert.match(r.cutoffNote,/conservative planning marker/);assert.ok(!r.start);}
});
test('published subscription is reproducible, mirrored, and includes preparation deep links',()=>{
 const base='https://clinical-trials.github.io/datacenter/site/';
 const rows=data.events.map(r=>({...r,toolkitUrl:base+'?proceeding='+encodeURIComponent(r.id)+'&prepare=records#citizen',commentUrl:base+'?proceeding='+encodeURIComponent(r.id)+'&prepare=comment#citizen'}));
 const expected=M.generateICS(rows,{now:data.updated,mode:'subscription',reminderDays:[7,1],reminderHours:[]});
 assert.equal(fs.readFileSync('site/public-deadlines.ics','utf8'),expected);
 assert.equal(fs.readFileSync('web/public/public-deadlines.ics','utf8'),expected);
 assert.match(expected.replace(/\r\n /g,''),/proceeding=nj-fair-share-comments&prepare=comment#citizen/);
 assert.doesNotMatch(expected,/DTSTART;VALUE=DATE:20261113|DTSTART;VALUE=DATE:20261116/);
});
