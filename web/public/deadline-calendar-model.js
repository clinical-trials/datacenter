/* Pure, source-checked calendar export. No network, storage, email, or personal data.
 * API: normalizeEvent(record), assess(record,{now}), eligibleEvents(records,{now}),
 * generateICS(records,{now,reminderDays:[7,1],reminderHours:[],mode:'download'}),
 * googleCalendarUrl(record,{now}), uidFor(record),
 * preparationTarget(record,{now,days:3,closedDates:[]}),
 * makePreparationEvent(record,{now,days:3,closedDates:[],updated}).
 * For subscription snapshots use mode:'subscription' (or includeCancelled:true).
 * Keep id + proceedingId + kind unchanged when extending a date; increment sequence
 * and set updated to the actual revision timestamp. Only explicit inactive statuses
 * produce cancellation components. Missing records never imply cancellation.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DeadlineCalendarModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const statuses=['active','superseded','cancelled','permit-issued'];
  const officialKinds=['hearing','comment-deadline'];
  const kinds=officialKinds.concat('preparation');
  const text=(value,max=12000)=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,max).trim():'';
  function safeUrl(value){try{const u=new URL(text(value,4000));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function validDay(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const date=new Date(value+'T12:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function validZone(value){if(!value)return false;try{new Intl.DateTimeFormat('en-US',{timeZone:value}).format(0);return true;}catch{return false;}}
  function timestamp(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value)||!validDay(value.slice(0,10)))return null;
    const ms=Date.parse(value);return Number.isFinite(ms)?ms:null;
  }
  function localDay(now,zone){
    const p=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
    return ['year','month','day'].map(k=>p.find(v=>v.type===k).value).join('-');
  }
  function localClockMatches(value,zone){
    // An explicit UTC timestamp is already unambiguous; an agency's local offset
    // must also agree with its named zone, including daylight saving transitions.
    if(value.endsWith('Z'))return true;
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
    const pick=k=>p.find(v=>v.type===k).value;
    const actual=['year','month','day'].map(pick).join('-')+'T'+['hour','minute','second'].map(pick).join(':');
    return actual===value.slice(0,16)+(value[16]===':'?value.slice(16,19):':00');
  }
  function normalizeEvent(record){
    const r=record&&typeof record==='object'?record:{};
    const e={id:text(r.id,200),proceedingId:text(r.proceedingId,250),kind:text(r.kind,40),title:text(r.title,1000),
      agency:text(r.agency,500),verified:r.verified===true,sourceUrl:safeUrl(r.sourceUrl||r.url),checked:text(r.checked,10),
      status:text(r.status,40),sequence:Number.isSafeInteger(r.sequence)&&r.sequence>=0?r.sequence:0,
      updated:timestamp(r.updated)!==null?r.updated:'',date:text(r.date,10),zone:text(r.zone,100),
      start:text(r.start,50),end:text(r.end,50),description:text(r.description||r.detail),
      location:text(r.location||r.where,2000),phase:text(r.phase,1000),cutoffNote:text(r.cutoffNote,4000),
      dateNote:text(r.dateNote,4000),verificationNote:text(r.verificationNote,4000),
      personal:r.personal===true,parentId:text(r.parentId,200),parentKind:text(r.parentKind,40),parentDate:text(r.parentDate,10),
      participationUrl:safeUrl(r.participationUrl),toolkitUrl:safeUrl(r.toolkitUrl),commentUrl:safeUrl(r.commentUrl)};
    const errors=[];
    if(!e.id||!e.proceedingId)errors.push('A stable event and proceeding identifier are required.');
    if(!kinds.includes(e.kind))errors.push('Event type is not a hearing, comment deadline or personal preparation target.');
    if(e.kind==='preparation'&&(!e.personal||!e.parentId||!officialKinds.includes(e.parentKind)||!validDay(e.parentDate)))errors.push('A preparation target must be explicitly personal and identify its source event.');
    if(e.kind!=='preparation'&&e.personal)errors.push('An official event cannot be classified as personal.');
    if(!statuses.includes(e.status))errors.push('Proceeding status is not established.');
    if(!e.title)errors.push('Event title is missing.');
    if(!e.verified||!e.sourceUrl||!e.agency||!validDay(e.checked))errors.push('Verified official source, agency and checked date are required.');
    if(!validZone(e.zone))errors.push('A verified event time zone is required.');
    if(e.start){
      if(timestamp(e.start)===null)errors.push('Start time needs an exact ISO timestamp with a UTC offset.');
      else {
        if(validZone(e.zone)&&!localClockMatches(e.start,e.zone))errors.push('Start offset disagrees with the event time zone.');
        if(e.date&&(!validDay(e.date)||validZone(e.zone)&&localDay(e.start,e.zone)!==e.date))errors.push('Listed date disagrees with the event start.');
        if(!e.date&&validZone(e.zone))e.date=localDay(e.start,e.zone);
      }
      if(e.end&&(timestamp(e.end)===null||timestamp(e.start)===null||timestamp(e.end)<=timestamp(e.start)))errors.push('End time must be an exact instant after start.');
      else if(e.end&&validZone(e.zone)&&!localClockMatches(e.end,e.zone))errors.push('End offset disagrees with the event time zone.');
    }else{
      if(!validDay(e.date))errors.push('A valid listed calendar date is required.');
      if(e.end)errors.push('An end clock without a start clock cannot establish an event time.');
    }
    if(e.kind==='preparation'&&(e.start||e.date>=e.parentDate))errors.push('A personal preparation target must be an all-day date before its source event.');
    e.allDay=!e.start;e.errors=errors;e.valid=errors.length===0;
    return e;
  }
  function nowMs(options){const value=options&&options.now;const n=value===undefined?Date.now():new Date(value).getTime();return Number.isFinite(n)?n:null;}
  function assess(record,options){
    const e=normalizeEvent(record),now=nowMs(options);
    if(!e.valid)return {event:e,eligible:false,reason:e.errors[0]};
    if(now===null)return {event:e,eligible:false,reason:'Current time is invalid.'};
    if(e.checked>localDay(now,e.zone))return {event:e,eligible:false,reason:'The checked date is in the future.'};
    if(e.status!=='active')return {event:e,eligible:false,reason:'This record is '+e.status+'. Check the latest official notice.'};
    if(e.allDay){
      const day=localDay(now,e.zone);
      if(e.date<=day)return {event:e,eligible:false,reason:e.date===day?'Listed date reached; closing clock time is not verified.':'The listed event date has passed.'};
    }else if(now>=(e.kind==='hearing'&&e.end?timestamp(e.end):timestamp(e.start))){
      return {event:e,eligible:false,reason:'The announced event time has passed.'};
    }
    return {event:e,eligible:true,reason:''};
  }
  function hash(value){let a=2166136261,b=2246822519;for(const ch of value){const c=ch.codePointAt(0);a=Math.imul(a^c,16777619)>>>0;b=Math.imul(b^c,3266489917)>>>0;}return a.toString(16).padStart(8,'0')+b.toString(16).padStart(8,'0');}
  function uidFor(record){const e=normalizeEvent(record);return e.id&&e.proceedingId&&kinds.includes(e.kind)?'dc-'+hash(e.proceedingId+'|'+e.id+'|'+e.kind)+'@clinical-trials.github.io':'';}
  function latestEvents(records){
    const latest=new Map();
    for(const r of Array.isArray(records)?records:[]){
      const e=normalizeEvent(r),uid=uidFor(e);if(!uid)continue;
      const old=latest.get(uid);
      const rank=e=>[e.sequence,timestamp(e.updated)||0,e.status==='active'?0:1];
      const a=rank(e),b=old?rank(old):null;
      if(!old||a[0]>b[0]||a[0]===b[0]&&(a[1]>b[1]||a[1]===b[1]&&a[2]>b[2]))latest.set(uid,e);
    }
    return Array.from(latest.values()).sort((a,b)=>uidFor(a).localeCompare(uidFor(b)));
  }
  function eligibleEvents(records,options){return latestEvents(records).filter(e=>assess(e,options).eligible);}
  function descriptionFor(e){
    return [e.personal?'Suggested personal target, not an official or legal deadline. The source verification applies to the parent notice, not to this calculated planning date.':'',
      e.description,'Proceeding: '+e.proceedingId,'Agency: '+e.agency,e.phase&&'Project phase: '+e.phase,
      'Record status: '+e.status,'Official source: '+e.sourceUrl,'Source checked: '+e.checked,
      e.personal?'All-day personal planning marker. Parent notice date: '+e.parentDate+'. Recheck that notice and all submission rules.':e.allDay?'All-day calendar marker for the listed date, not a verified closing clock time. Confirm the clock time, time zone, extensions and submission rules with the agency.':!e.end&&e.kind==='hearing'?'No hearing end time is established in this record.':'',
      e.cutoffNote,e.dateNote,e.verificationNote,
      e.participationUrl&&'Official participation instructions: '+e.participationUrl,
      e.toolkitUrl&&'Find and review the records: '+e.toolkitUrl,
      e.commentUrl&&'Prepare a public comment: '+e.commentUrl,
      'Calendar reminders are personal preparation prompts, not legal filing deadlines. All-day reminder timing follows the recipient calendar time zone; confirm settings after adding. Recheck the official notice before acting.'
    ].filter(Boolean).join('\n');
  }
  function escapeText(value){return String(value).replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
  function byteLength(ch){const n=ch.codePointAt(0);return n<=0x7f?1:n<=0x7ff?2:n<=0xffff?3:4;}
  function fold(line){let out='',used=0;for(const ch of line){const size=byteLength(ch);if(used+size>75){out+='\r\n ';used=1;}out+=ch;used+=size;}return out;}
  const compactDay=day=>day.replace(/-/g,'');
  const utc=value=>new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  function shiftDay(day,amount){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
  function preparationTarget(record,options){
    const opts=options||{},result=assess(record,opts),e=result.event;
    const days=opts.days===undefined?3:opts.days;
    const closedDates=Array.from(new Set((Array.isArray(opts.closedDates)?opts.closedDates:[]).filter(validDay).slice(0,400))).sort();
    const limit='Planning rule skips weekends and only the supplied agency closed dates. It does not know all holidays or establish a legal deadline; verify agency closures and submission rules.';
    const target={date:'',future:false,eligible:false,days,parentDate:e.date,zone:e.zone,
      label:'Suggested personal target, not a legal deadline',limit,closedDates,reason:''};
    if(!result.eligible||!officialKinds.includes(e.kind)){target.reason=result.reason||'Use a current official hearing or comment notice.';return target;}
    if(!Number.isInteger(days)||days<1||days>30){target.reason='Choose between 1 and 30 planning weekdays.';return target;}
    const closed=new Set(closedDates);let remaining=days,date=e.date;
    while(remaining>0){
      date=shiftDay(date,-1);
      const weekday=new Date(date+'T12:00:00Z').getUTCDay();
      if(weekday!==0&&weekday!==6&&!closed.has(date))remaining--;
    }
    target.date=date;target.future=date>localDay(nowMs(opts),e.zone);target.eligible=target.future;
    if(!target.future)target.reason='This suggested personal target has been reached. Plan your next step now and check the agency instructions; this does not extend the actual deadline.';
    return target;
  }
  function makePreparationEvent(record,options){
    const opts=options||{},target=preparationTarget(record,opts);if(!target.eligible)return null;
    const e=normalizeEvent(record),verb=e.kind==='hearing'?'prepare for':'send comments for';
    return normalizeEvent({...e,id:e.id+'-prepare',kind:'preparation',personal:true,parentId:e.id,parentKind:e.kind,parentDate:e.date,
      date:target.date,start:'',end:'',location:'Personal preparation plan',
      title:'Personal target — '+verb+' '+e.title,
      description:'Suggested personal target, not an official or legal deadline. Aim to send a substantive, valid comment early, following the official method and required information; not a placeholder submission. Early submission does not guarantee acceptance, standing or an appeal right. For a hearing, use this day to prepare testimony and check any actual registration rules. '+target.limit+(e.description?'\nParent notice context: '+e.description:''),
      updated:timestamp(opts.updated)!==null?opts.updated:e.updated,
      verificationNote:[e.verificationNote,'Calculated '+target.days+' planning weekdays before the parent notice date. '+target.limit].filter(Boolean).join('\n')});
  }
  function reminderOffsets(options,key,defaults,allowed){const r=options&&options[key];return Array.from(new Set((Array.isArray(r)?r:defaults).filter(n=>allowed.includes(n))));}
  function alarmLines(e,options,now){
    const dayOffsets=reminderOffsets(options,'reminderDays',[7,1],[7,1]);
    const hourOffsets=e.allDay?[]:reminderOffsets(options,'reminderHours',[],[2]);
    // DATE alarms float in the recipient calendar's zone. Be conservative: a
    // midnight alarm must still be future even in UTC+14, the earliest day boundary.
    const earliestRecipientDay=new Date(now+14*3600000).toISOString().slice(0,10);
    const values=dayOffsets.map(n=>({n,unit:'D',future:e.allDay?shiftDay(e.date,-n)>earliestRecipientDay:timestamp(e.start)-n*86400000>now}))
      .concat(hourOffsets.map(n=>({n,unit:'H',future:timestamp(e.start)-n*3600000>now})));
    const lines=[];
    for(const v of values.filter(v=>v.future)){
      const action=e.personal?'Personal planning reminder: check the official notice and prepare a substantive submission.':v.unit==='D'&&v.n===7?'Find the official records and begin a comment.':v.unit==='D'?'Check for an extension, confirm instructions and finish your comment.':'Confirm the official time and participation instructions.';
      lines.push('BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-P'+(v.unit==='H'?'T':'')+v.n+v.unit,
        'DESCRIPTION:'+escapeText(action+'\n'+e.title+'\nOfficial source: '+e.sourceUrl+(e.commentUrl?'\nPublic-comment guide: '+e.commentUrl:'')+(e.toolkitUrl?'\nRecords toolkit: '+e.toolkitUrl:'')+(e.personal?'\nPersonal target, not an official or legal deadline.':e.allDay?'\nCalendar-day reminder; no exact closing time has been established.':'')),
        'END:VALARM');
    }
    return lines;
  }
  function generateICS(records,options){
    const opts=options||{},now=nowMs(opts),subscription=opts.mode==='subscription'||opts.includeCancelled===true;
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Data Center Research Observatory//Public Participation Calendar//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:Data-center public participation'];
    if(now!==null)for(const e of latestEvents(records)){
      const eligible=assess(e,{now}).eligible;
      const cancelled=subscription&&e.valid&&e.status!=='active'&&e.checked<=localDay(now,e.zone);
      if(!eligible&&!cancelled)continue;
      lines.push('BEGIN:VEVENT','UID:'+uidFor(e),'SEQUENCE:'+e.sequence,'DTSTAMP:'+utc(e.updated||now));
      if(e.updated)lines.push('LAST-MODIFIED:'+utc(e.updated));
      if(e.allDay)lines.push('DTSTART;VALUE=DATE:'+compactDay(e.date),'DTEND;VALUE=DATE:'+compactDay(shiftDay(e.date,1)));
      else {lines.push('DTSTART:'+utc(e.start));if(e.end)lines.push('DTEND:'+utc(e.end));}
      lines.push('SUMMARY:'+escapeText(e.title),'DESCRIPTION:'+escapeText(descriptionFor(e)),'URL:'+e.sourceUrl,'STATUS:'+(cancelled?'CANCELLED':'CONFIRMED'),'TRANSP:TRANSPARENT');
      if(e.personal)lines.push('CATEGORIES:PERSONAL PREPARATION','X-OBSERVATORY-EVENT-TYPE:PERSONAL-PREPARATION');
      if(e.location)lines.push('LOCATION:'+escapeText(e.location));
      if(!cancelled)lines.push(...alarmLines(e,opts,now));
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
  }
  function googleCalendarUrl(record,options){
    const result=assess(record,options);if(!result.eligible)return '';
    const e=result.event,url=new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action','TEMPLATE');url.searchParams.set('text',e.title);
    url.searchParams.set('dates',e.allDay?compactDay(e.date)+'/'+compactDay(shiftDay(e.date,1)):utc(e.start)+'/'+utc(e.end||e.start));
    url.searchParams.set('details',descriptionFor(e)+'\nChoose reminders in your calendar; this link does not configure them.');
    url.searchParams.set('ctz',e.zone);if(e.location)url.searchParams.set('location',e.location);
    return url.href;
  }
  return {normalizeEvent,assess,eligibleEvents,generateICS,googleCalendarUrl,uidFor,preparationTarget,makePreparationEvent};
});
