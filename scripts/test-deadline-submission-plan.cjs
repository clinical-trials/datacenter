'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const model=require('../site/deadline-calendar-model.js');
const now='2026-11-18T18:00:00Z';
const base={id:'in-msft-comments',proceedingId:'idem-50526',kind:'comment-deadline',title:'Microsoft comments',
  agency:'Indiana Department of Environmental Management',verified:true,
  sourceUrl:'https://www.in.gov/idem/notice.pdf',checked:'2026-11-18',updated:'2026-11-18T18:00:00Z',
  status:'active',sequence:0,date:'2026-11-30',zone:'America/Chicago',
  cutoffNote:'Listed date only; confirm the actual closing time.',
  toolkitUrl:'https://clinical-trials.github.io/datacenter/#toolkit',commentUrl:'https://clinical-trials.github.io/datacenter/#citizen'};
const unfold=s=>s.replace(/\r\n[ \t]/g,'');

test('three planning weekdays skip weekends and only the supplied agency closures',()=>{
  const ordinary=model.preparationTarget(base,{now,days:3});
  assert.equal(ordinary.date,'2026-11-25');
  assert.equal(ordinary.eligible,true);
  assert.equal(ordinary.future,true);
  const closed=model.preparationTarget(base,{now,days:3,closedDates:['2026-11-26','2026-11-27']});
  assert.equal(closed.date,'2026-11-23');
  assert.match(closed.label,/personal target.*not.*legal deadline/i);
  assert.match(closed.limit,/only.*supplied.*closed|supplied.*only/i);
  assert.match(closed.limit,/holiday/i);
});

test('planning steps use calendar dates across DST and do not subtract fixed 24-hour intervals',()=>{
  const event={...base,date:'2027-03-15',start:'2027-03-15T00:30:00-05:00'};
  assert.equal(model.preparationTarget(event,{now,days:1}).date,'2027-03-12');
  assert.equal(model.preparationTarget({...base,date:'2027-11-08'},{now,days:1}).date,'2027-11-05');
});

test('a passed target prompts action now without moving or extending the official date',()=>{
  const result=model.preparationTarget(base,{now:'2026-11-26T18:00:00Z',days:3});
  assert.equal(result.date,'2026-11-25');
  assert.equal(result.eligible,false);
  assert.equal(result.future,false);
  assert.equal(result.parentDate,'2026-11-30');
  assert.match(result.reason,/now/i);
  assert.match(result.reason,/not.*extend|does not.*extend/i);
  assert.equal(model.makePreparationEvent(base,{now:'2026-11-26T18:00:00Z',days:3}),null);
});

test('past, inactive, unverified and invalid parent records cannot produce personal calendar targets',()=>{
  for(const patch of [{date:'2026-11-17'},{status:'cancelled'},{verified:false},{date:'2026-02-30'}]){
    assert.equal(model.preparationTarget({...base,...patch},{now}).eligible,false);
    assert.equal(model.makePreparationEvent({...base,...patch},{now}),null);
  }
  assert.equal(model.preparationTarget(base,{now,days:0}).eligible,false);
  assert.equal(model.preparationTarget(base,{now,days:Infinity}).eligible,false);
});

test('a preparation event is explicitly personal, retains source limits and is distinct from the official deadline',()=>{
  const personal=model.makePreparationEvent({...base,description:'Use the official comment channel.'},{now,days:3});
  assert.equal(personal.kind,'preparation');
  assert.equal(personal.personal,true);
  assert.equal(personal.parentId,base.id);
  assert.equal(personal.parentDate,base.date);
  assert.equal(personal.date,'2026-11-25');
  assert.equal(personal.start,'');
  assert.equal(model.assess(personal,{now}).eligible,true);
  assert.notEqual(model.uidFor(personal),model.uidFor(base));
  const ics=unfold(model.generateICS([personal],{now}));
  assert.match(ics,/SUMMARY:Personal target/);
  assert.match(ics,/not an official or legal deadline/i);
  assert.match(ics,/does not guarantee.*standing|does not establish.*standing/i);
  assert.match(ics,/not.*placeholder/i);
  assert.match(ics,/DTSTART;VALUE=DATE:20261125/);
  assert.match(ics,/Source checked: 2026-11-18/);
  assert.match(ics,/#citizen/);
  assert.match(ics,/confirm the actual closing time/i);
  assert.match(ics,/Use the official comment channel/);
  const details=new URL(model.googleCalendarUrl(personal,{now})).searchParams.get('details');
  assert.match(details,/personal target/i);
  assert.match(details,/not an official or legal deadline/i);
});

test('the personal flag and parent reference are required for the preparation kind',()=>{
  for(const patch of [{personal:false},{parentId:''},{parentKind:'preparation'},{parentDate:''}]){
    const personal=model.makePreparationEvent(base,{now});
    assert.equal(model.assess({...personal,...patch},{now}).eligible,false);
  }
  assert.equal(model.makePreparationEvent(model.makePreparationEvent(base,{now}),{now}),null);
});
