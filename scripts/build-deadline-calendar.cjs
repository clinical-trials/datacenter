/* Rebuild after reviewing notices; never infer extensions, cancellation or issuance. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const model=require('../site/deadline-calendar-model.js');
const root=path.resolve(__dirname,'..');
const register=JSON.parse(fs.readFileSync(path.join(root,'site/deadline-events.json'),'utf8'));
if(register.schemaVersion!==1||!Array.isArray(register.events)||!Number.isFinite(Date.parse(register.updated)))throw Error('Invalid register metadata');
const ids=new Set(),uids=new Set();
for(const event of register.events){
 const normalized=model.normalizeEvent(event),uid=model.uidFor(event);
 if(!normalized.valid||!event.updated||ids.has(event.id)||uids.has(uid))throw Error('Invalid or duplicate event '+event.id+': '+normalized.errors.join(' '));
 ids.add(event.id);uids.add(uid);
}
const base='https://clinical-trials.github.io/datacenter/site/';
const events=register.events.map(r=>({...r,toolkitUrl:base+'?proceeding='+encodeURIComponent(r.id)+'&prepare=records#citizen',commentUrl:base+'?proceeding='+encodeURIComponent(r.id)+'&prepare=comment#citizen'}));
// Review timestamp, not a changing build clock, makes the published feed reproducible.
const calendar=model.generateICS(events,{now:register.updated,mode:'subscription',reminderDays:[7,1],reminderHours:[]});
for(const directory of ['site','web/public']){
 fs.writeFileSync(path.join(root,directory,'public-deadlines.ics'),calendar);
 if(directory!=='site')fs.copyFileSync(path.join(root,'site/deadline-events.json'),path.join(root,directory,'deadline-events.json'));
}
console.log('Built checked calendar: '+model.eligibleEvents(events,{now:register.updated}).length+' future notices; '+register.events.length+' source records.');
