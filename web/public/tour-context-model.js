/* Portable tour context: no geocoding, network, storage, legal conclusions or
 * inferred facility restrictions. Return values are plain text, never HTML.
 * API: placeFor(stop), matchMeasures(stops,measures), promptsFor(lens),
 * nationalStory(postElection), summaryFor(stops,data,{lens}),
 * exportText(stops,data,{lens,notes}).
 */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.TourContextModel=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const pairs='AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|DC:District of Columbia|PR:Puerto Rico'.split('|').map(s=>s.split(':'));
  const states=new Map(pairs.flatMap(([code,name])=>[[code.toLowerCase(),code],[name.toLowerCase(),code]]));
  const clean=(s,max=5000)=>typeof s==='string'?s.slice(0,max).trim():'';
  const key=s=>clean(s,200).normalize('NFKC').toLowerCase().replace(/\s+/g,' ');
  const stateFor=s=>states.get(key(s))||'';
  const unknown=()=>({city:'',state:'',confidence:'unknown'});
  function cityFor(value){
    const city=clean(value,100);
    if(!city||/[\r\n]/.test(city)||!/[\p{L}]/u.test(city)||!/^[\p{L}\p{M} .’'&-]+$/u.test(city)||/\b(?:county|parish|unincorporated|statewide)\b/i.test(city))return '';
    return city.replace(/\s+/g,' ');
  }
  function safeUrl(value){try{const u=new URL(clean(value,4000));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function placeFor(stop){
    if(!stop||typeof stop!=='object')return unknown();
    const city=cityFor(stop.city),state=stateFor(stop.state);
    if((clean(stop.city)&&!city)||(clean(stop.state)&&!state))return unknown();
    const address=clean(stop.address,1000);
    if(/[\r\n]/.test(address))return unknown();
    const match=address.match(/(?:^|,)\s*([^,]+),\s*([A-Za-z]{2})\s+\d{5}(?:-\d{4})?(?:,\s*(?:USA|US|United States(?: of America)?))?\s*$/i);
    const parsedCity=match?cityFor(match[1]):'',parsedState=match?stateFor(match[2]):'';
    if(parsedCity&&parsedState&&((city&&key(city)!==key(parsedCity))||(state&&state!==parsedState)))return unknown();
    if(city&&state)return {city,state,confidence:'structured'};
    return parsedCity&&parsedState?{city:parsedCity,state:parsedState,confidence:'address'}:unknown();
  }
  const boundaryCaveat='Verify municipal boundaries and measure coverage. A city-name match does not establish that this measure applies to a facility or grants access to its property.';
  function safeMeasure(record){
    if(!record||typeof record!=='object')return null;
    const jurisdiction=cityFor(record.jurisdiction),state=stateFor(record.state);
    const scope=[record.jurisdictionType,record.jurisdictionLevel,record.scope].map(s=>clean(s,500)).join(' ');
    if(!jurisdiction||!state||/\b(?:county|countywide|parish|statewide|state|national|nationwide|unincorporated)\b/i.test(scope))return null;
    const sources=(Array.isArray(record.sources)?record.sources:[]).map(s=>({kind:clean(s&&s.kind,40),label:clean(s&&s.label,300),url:safeUrl(s&&s.url)})).filter(s=>s.url);
    if(!sources.some(s=>s.kind==='official'))return null;
    const measure={id:clean(record.id,200),state,jurisdiction,sources};
    for(const field of ['title','type','effect','summary','yes','no','outcome','result','limit','question','checked','electionDate','legalEffect','resultStatus','nextStep'])measure[field]=clean(record[field]);
    return measure;
  }
  function matchMeasures(stops,measures){
    const placed=(Array.isArray(stops)?stops:[]).filter(s=>s&&typeof s==='object').map(stop=>({stop,place:placeFor(stop)}));
    const matches=[],seen=new Set(),matchedPlaces=new Set();
    for(const raw of Array.isArray(measures)?measures:[]){
      const measure=safeMeasure(raw);if(!measure)continue;
      const placeKey=measure.state+'|'+key(measure.jurisdiction),identity=placeKey+'|'+(measure.id||key(measure.title));
      if(seen.has(identity))continue;seen.add(identity);
      const found=placed.filter(p=>p.place.confidence!=='unknown'&&p.place.state===measure.state&&key(p.place.city)===key(measure.jurisdiction));
      if(!found.length)continue;
      matchedPlaces.add(placeKey);
      matches.push({measure,stops:found.map(p=>p.stop),
        matchBasis:found.some(p=>p.place.confidence==='address')?'Exact address city match and state; verify municipal boundary and coverage.':'Exact structured city match and state; verify municipal boundary and coverage.',
        caveat:boundaryCaveat});
    }
    const unmatchedPlaces=[],unmatchedKeys=new Set();
    for(const [i,p] of placed.entries()){
      const placeKey=p.place.confidence==='unknown'?'unknown|'+i:p.place.state+'|'+key(p.place.city);
      if(matchedPlaces.has(placeKey)||unmatchedKeys.has(placeKey))continue;unmatchedKeys.add(placeKey);
      unmatchedPlaces.push({...p.place,reason:p.place.confidence==='unknown'?'City and state are not established; local measure coverage is unknown.':'No exact city/state match in these selected records. Local measure coverage remains unknown.'});
    }
    return {matches,unmatchedPlaces};
  }
  const prompts={
    health:[
      'From a public sidewalk, what can you notice about noise, visible exhaust and nearby homes?',
      'What do permits and monitoring records show about generator hours, PM₂.₅, NOₓ and nighttime noise?',
      'Who can investigate a concern, and what measurements would distinguish this facility from other pollution sources?'
    ],
    costs:[
      'Which roads, power lines or water works can you see nearby, without assuming who paid for them?',
      'Which agreements show taxes actually received, incentives and who funds new infrastructure?',
      'Which costs remain unmeasured, including public health costs, and who is responsible for monitoring and payment?'
    ],
    decisions:[
      'What does public signage reveal about the operator and project phase?',
      'Which zoning, permit or ballot records name this jurisdiction, and are their actions binding or advisory?',
      'Which decision is still open, who makes it and when can residents participate?'
    ]
  };
  const lensFor=lens=>Object.hasOwn(prompts,lens)?lens:'health';
  function promptsFor(lens){return prompts[lensFor(lens)].slice();}
  function validDay(day){if(!/^\d{4}-\d{2}-\d{2}$/.test(day||''))return false;const d=new Date(day+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===day;}
  function nationalStory(value){
    const s=value&&typeof value==='object'?value:{},url=safeUrl(s.url);
    const limit='These selected local outcomes are not a count of binding bans, a national opinion poll or evidence that a restriction applies to a tour stop. Check certification, implementation, boundaries and the actual legal instrument locally.';
    const unavailable={available:false,title:'National election context',summary:'A reconciled national election snapshot is not available in this selection.',sourceUrl:url,asOf:'',checked:'',counts:null,limit};
    const fields=['total','favoringLimits','approvedLimiting','rejectedSupportive','rejectedReview','totalYear','decidedYear','favoringLimitsYear','pendingYear','advisory'];
    if(!fields.every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)||s.total<1||!url||!clean(s.source,200)||!validDay(s.asOf)||!validDay(s.checked)||!validDay(s.electionDate)||s.electionDate>s.asOf||s.asOf>s.checked)return unavailable;
    if(s.approvedLimiting+s.rejectedSupportive!==s.favoringLimits||s.favoringLimits+s.rejectedReview!==s.total||s.advisory>s.total||s.decidedYear+s.pendingYear!==s.totalYear||s.decidedYear<s.total||s.favoringLimitsYear<s.favoringLimits||s.favoringLimitsYear>s.decidedYear)return unavailable;
    if(s.byState){const entries=Object.entries(s.byState);if(!entries.length||!entries.every(([k,n])=>stateFor(k)===k&&Number.isSafeInteger(n)&&n>=0)||entries.reduce((sum,[,n])=>sum+n,0)!==s.totalYear)return unavailable;}
    for(const [list,total] of [[s.categories,s.approvedLimiting],[s.rejectedCategories,s.rejectedSupportive]])if(list&&(!Array.isArray(list)||!list.every(r=>r&&Number.isSafeInteger(r.count)&&r.count>=0)||list.reduce((sum,r)=>sum+r.count,0)!==total))return unavailable;
    const date=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(s.electionDate+'T12:00:00Z'));
    return {available:true,title:'Local votes. Different legal effects.',
      summary:clean(s.source,200)+' reports that '+s.favoringLimits+' of '+s.total+' local contests on '+date+' favored limits: '+s.approvedLimiting+' limiting or opposition measures passed and '+s.rejectedSupportive+' supportive measures failed. '+s.advisory+' questions were advisory. Verify each decision’s legal effect and covered area before connecting it to a tour stop.',
      sourceUrl:url,asOf:s.asOf,checked:s.checked,counts:Object.fromEntries(fields.map(k=>[k,s[k]])),limit:limit+(clean(s.limit)?'\n'+clean(s.limit):'')};
  }
  const tourLimit='Observe from lawful public places. A visit cannot establish emissions, water use, health effects or who paid a public cost. An address or city-name match does not verify a municipal boundary, facility operation, permission to enter or a measure’s applicability. Missing coverage remains unknown.';
  function summaryFor(stops,data,options){
    const list=Array.isArray(stops)?stops:[],d=data&&typeof data==='object'?data:{},lens=lensFor(options&&options.lens);
    return {lens,prompts:promptsFor(lens),places:list.map(placeFor),local:matchMeasures(list,d.measures),national:nationalStory(d.postElection),limit:tourLimit};
  }
  function exportText(stops,data,options){
    const opts=options||{},list=Array.isArray(stops)?stops:[],s=summaryFor(list,data,opts);
    const lines=['DATA-CENTER TOUR FIELD NOTES','Lens: '+s.lens,s.limit,'','Questions for this walk or drive:',...s.prompts.map((q,i)=>(i+1)+'. '+q),''];
    for(const [i,stop] of list.entries()){
      if(!stop||typeof stop!=='object')continue;
      const place=placeFor(stop),source=safeUrl(stop.source);
      lines.push('Stop '+(i+1)+': '+(clean(stop.name,300)||'Unnamed stop'),'Address: '+(clean(stop.address,1000)||'Not established'),
        'Place: '+(place.confidence==='unknown'?'City/state unknown':place.city+', '+place.state+' ('+place.confidence+' match; verify municipal boundary)'),
        'Project phase: '+(clean(stop.phase,1000)||'Not established in this record'));
      if(source)lines.push('Stop source: '+source);
      if(clean(stop.note,5000))lines.push('My observation (unverified personal note): '+clean(stop.note,5000));
      lines.push('');
    }
    if(clean(opts.notes,10000))lines.push('My additional notes (unverified):',clean(opts.notes,10000),'');
    lines.push('Local decision records to check:');
    if(!s.local.matches.length)lines.push('No exact city/state match in the selected records. Local coverage is unknown.');
    for(const match of s.local.matches){
      const m=match.measure;lines.push(m.jurisdiction+', '+m.state+': '+m.title,match.matchBasis,match.caveat);
      if(m.outcome)lines.push('Recorded outcome: '+m.outcome);
      if(m.resultStatus)lines.push('Result status: '+m.resultStatus);
      if(m.legalEffect)lines.push('Legal effect: '+m.legalEffect);
      if(m.nextStep)lines.push('Next step: '+m.nextStep);
      if(m.checked)lines.push('Record checked: '+m.checked);
      if(m.limit)lines.push('Record limit: '+m.limit);
      for(const source of m.sources.filter(source=>source.kind==='official'))lines.push((source.label||'Official record')+': '+source.url);
      lines.push('');
    }
    lines.push('National election context:',s.national.summary,s.national.limit);
    if(s.national.sourceUrl)lines.push('Source: '+s.national.sourceUrl);
    if(s.national.available)lines.push('Snapshot as of '+s.national.asOf+'; checked '+s.national.checked+'.');
    return lines.join('\n');
  }
  return {placeFor,matchMeasures,promptsFor,nationalStory,summaryFor,exportText};
});
