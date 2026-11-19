/* Calendar behavior, rather than UI implementation, is the contract tested here. */
'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const model = require('../site/deadline-calendar-model.js');
const now = '2026-11-18T18:00:00Z';
const base = {
  id: 'in-50413-comment', proceedingId: 'T073-50413-00077', kind: 'comment-deadline',
  title: 'Amazon air-permit comments', agency: 'Indiana Department of Environmental Management',
  verified: true, sourceUrl: 'https://www.in.gov/idem/notice.pdf', checked: '2026-11-18',
  status: 'active', sequence: 2, updated: '2026-11-18T10:00:00-05:00',
  date: '2026-12-13', zone: 'America/Chicago',
  cutoffNote: 'Listed closing date; confirm the next-open-business-day rule.',
  toolkitUrl: 'https://clinical-trials.github.io/datacenter/#toolkit',
  commentUrl: 'https://clinical-trials.github.io/datacenter/#citizen'
};
const unfold = value => value.replace(/\r\n[ \t]/g, '');
const blocks = value => unfold(value).split(/^BEGIN:VEVENT\r\n/m).slice(1).map(s => s.split(/^END:VEVENT/m)[0]);

test('date-only exports preserve uncertainty, exclusive end and calendar-day reminders', () => {
  const value = unfold(model.generateICS([base], {now, reminderDays:[7,1], reminderHours:[2]}));
  assert.match(value, /DTSTART;VALUE=DATE:20261213\r\n/);
  assert.match(value, /DTEND;VALUE=DATE:20261214\r\n/);
  assert.match(value, /TRIGGER:-P7D/);
  assert.match(value, /TRIGGER:-P1D/);
  assert.doesNotMatch(value, /-PT2H/);
  assert.match(value, /not a verified closing clock time/i);
  assert.match(value, /next-open-business-day/);
  assert.match(value, /#citizen/);
  assert.match(value, /ACTION:DISPLAY/);
  assert.doesNotMatch(value, /ACTION:EMAIL|ATTENDEE|ORGANIZER/);
});

test('known clocks use absolute UTC across daylight saving changes', () => {
  const value = model.generateICS([{...base, id:'spring-hearing', kind:'hearing', date:'2027-03-14',
    start:'2027-03-14T18:00:00-05:00', end:'2027-03-14T19:30:00-05:00'}], {now,reminderDays:[7,1],reminderHours:[2]});
  assert.match(value,/DTSTART:20270314T230000Z/);
  assert.match(value,/DTEND:20270315T003000Z/);
  assert.match(value,/TRIGGER:-PT2H/);
  assert.doesNotMatch(value,/TZID=/);
  assert.equal(model.assess({...base,start:'2027-03-14T18:00:00',date:'2027-03-14'},{now}).eligible,false);
  assert.equal(model.assess({...base,start:'2027-03-14T18:00:00-06:00',date:'2027-03-14'},{now}).eligible,false);
});

test('both fall-back offsets are distinct instants and a skipped spring clock is rejected', () => {
  const event = {...base,id:'dst',kind:'hearing',date:'2027-11-07'};
  const early = model.generateICS([{...event,start:'2027-11-07T01:30:00-05:00'}],{now});
  const late = model.generateICS([{...event,start:'2027-11-07T01:30:00-06:00'}],{now});
  assert.match(early,/DTSTART:20271107T063000Z/);
  assert.match(late,/DTSTART:20271107T073000Z/);
  assert.equal(model.assess({...event,date:'2027-03-14',start:'2027-03-14T02:30:00-06:00'},{now}).eligible,false);
});

test('date-only eligibility uses the event zone and disables a date reached without a cutoff', () => {
  const event = {...base,date:'2026-11-19',zone:'America/Los_Angeles'};
  assert.equal(model.assess(event,{now:'2026-11-19T01:00:00Z'}).eligible,true);
  assert.equal(model.assess(event,{now:'2026-11-19T09:00:00Z'}).eligible,false);
  assert.equal(model.assess({...event,zone:'not/a-zone'},{now}).eligible,false);
  const value = model.generateICS([base],{now:'2026-12-12T18:00:00Z',reminderDays:[7,1],reminderHours:[2]});
  assert.doesNotMatch(value,/BEGIN:VALARM/);
});

test('extensions retain UID and highest revision wins even if input is reversed', () => {
  const earlier = {...base,date:'2026-12-01',sequence:1,updated:'2026-11-17T15:00:00Z'};
  assert.equal(model.uidFor(base), model.uidFor(earlier));
  for (const records of [[base,earlier],[earlier,base]]) {
    const value = model.generateICS(records,{now});
    assert.equal(blocks(value).length,1);
    assert.match(value,/DTSTART;VALUE=DATE:20261213/);
    assert.match(value,/SEQUENCE:2/);
    assert.match(value,/LAST-MODIFIED:20261118T150000Z/);
  }
});

test('inactive or past events cannot be downloaded, while explicit cancellation replaces a subscription', () => {
  const cancelled = {...base,status:'cancelled',sequence:3,updated:'2026-11-19T15:00:00Z'};
  for (const status of ['cancelled','superseded','permit-issued']) {
    assert.equal(blocks(model.generateICS([{...base,status}],{now})).length,0);
  }
  assert.equal(blocks(model.generateICS([{...base,date:'2026-11-16'}],{now})).length,0);
  const value = model.generateICS([base,cancelled],{now,mode:'subscription'});
  assert.equal(blocks(value).length,1);
  assert.match(value,/STATUS:CANCELLED/);
  assert.match(value,/SEQUENCE:3/);
  assert.doesNotMatch(value,/BEGIN:VALARM/);
  assert.equal(blocks(model.generateICS([base,cancelled],{now})).length,0);
  assert.equal(blocks(model.generateICS([{...cancelled,date:'2026-11-16'}],{now,includeCancelled:true})).length,1);
});

test('verified source metadata is required and unsafe links never escape into a calendar', () => {
  for (const patch of [{verified:false},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:password@example.org/'},
    {agency:''},{checked:'2026-02-30'},{id:''},{proceedingId:''},{status:'unknown'}]) {
    assert.equal(model.assess({...base,...patch},{now}).eligible,false,JSON.stringify(patch));
  }
  const value = model.generateICS([{...base,commentUrl:'javascript:alert(1)',toolkitUrl:'http://unsafe.example/'}],{now});
  assert.doesNotMatch(value,/javascript:|unsafe.example/);
  const legacy = require('../site/public-events.js').events;
  assert.equal(model.eligibleEvents(legacy,{now}).length,0);
});

test('text escaping, CRLF and UTF-8 folding prevent injected properties without breaking glyphs', () => {
  const title = 'PM₂.₅; NOₓ, water \\ climate 🦖 '.repeat(10)+'\r\nBEGIN:VEVENT';
  const value = model.generateICS([{...base,title}],{now});
  assert.equal(value.replace(/\r\n/g,'' ).includes('\n'),false);
  for (const line of value.split('\r\n')) assert.ok(Buffer.byteLength(line,'utf8')<=75,line);
  assert.equal(blocks(value).length,1);
  assert.ok(unfold(value).includes('PM₂.₅\\; NOₓ\\, water \\\\ climate 🦖'));
  assert.ok(unfold(value).includes('\\nBEGIN:VEVENT'));
  assert.doesNotMatch(value,/\uFFFD/);
});

test('only still-future selected display alarms are emitted', () => {
  const event = {...base,kind:'hearing',start:'2026-12-13T18:00:00-06:00',end:'2026-12-13T19:00:00-06:00'};
  const value = model.generateICS([event],{now:'2026-12-13T23:00:00Z',reminderDays:[7,1],reminderHours:[2]});
  assert.doesNotMatch(value,/BEGIN:VALARM/);
  assert.equal(blocks(value).length,1);
  assert.doesNotMatch(model.generateICS([event],{now,reminderDays:[],reminderHours:[]}),/BEGIN:VALARM/);
});

test('all-day alarms are suppressed when midnight could already have passed in a recipient calendar', () => {
  const value=model.generateICS([base],{now:'2026-12-11T20:00:00Z',reminderDays:[1]});
  assert.doesNotMatch(value,/BEGIN:VALARM/);
});

test('Google links use exact dates, source and uncertainty without inventing reminder settings', () => {
  const link = new URL(model.googleCalendarUrl(base,{now}));
  assert.equal(link.origin,'https://calendar.google.com');
  assert.equal(link.searchParams.get('dates'),'20261213/20261214');
  assert.match(link.searchParams.get('details'),/not a verified closing clock time/i);
  assert.match(link.searchParams.get('details'),/https:\/\/www.in.gov\/idem\/notice.pdf/);
  assert.equal(link.searchParams.has('reminders'),false);
  assert.equal(model.googleCalendarUrl({...base,status:'cancelled'},{now}), '');
});
