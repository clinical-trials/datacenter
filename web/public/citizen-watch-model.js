/* Interest matching and comparisons of saved records; no claims of live collection. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CitizenWatchModel=api;})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const stateNames={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia',PR:'Puerto Rico'};
 const companies={amazon:/\bamazon\b|\baws\b/i,google:/\bgoogle\b|\balphabet\b/i,microsoft:/\bmicrosoft\b|\bazure\b/i,meta:/\bmeta\b(?![\s\u2010-\u2015-]*(?:analys\w*|regress\w*|learning|review\w*)\b)|\bfacebook\b/i,oracle:/\boracle\b/i,xai:/\bxai\b|\bcolossus\b|\bspacexai\b/i};
 const topicRules={air:/\bair\b|asthma|respirat|pollut|diesel|noise|acoustic|decibel|\bnox\b|NO₂|PM₂|PM2\.5|fine.particle|\bhealth\b/i,water:/water|aquifer|watershed|wetland|\bstream\b|drought|gallon|liters?|\bWUE\b/i,power:/electric|\bpower\b|\bgrid\b|generator|turbine|\benergy\b|\bMW\b|\bkWh\b/i,climate:/climate|carbon|\bCO2\b|CO₂|greenhouse|warming|\bGHG\b|\bemissions\b/i,hardware:/hardware|e.waste|retired|recycl|refurb|server|equipment.life|manufactur|circular/i,community:/communit|residen|tax|rebate|payment|revenue|infrastructure|\bcost|benefit|justice|equity|compensation|public.comment|hearing/i,efficiency:/efficien|\bPUE\b|cooling|thermosyphon|heat.reuse|heat.recover|useful.work|workload|utilization/i};
 const topics=Object.keys(topicRules);
 const text=v=>typeof v==='string'?v.trim().slice(0,16000):typeof v==='number'&&Number.isFinite(v)?String(v):'';
 const own=(o,k)=>o!==null&&typeof o==='object'&&Object.prototype.hasOwnProperty.call(o,k);
 const safeUrl=value=>{try{const url=new URL(text(value));return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}};
 function date(value){
  const s=text(value);if(/^\d{4}$/.test(s)||/^\d{4}-(0[1-9]|1[0-2])$/.test(s))return s;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
  const parsed=new Date(s+'T00:00:00Z');return Number.isFinite(+parsed)&&parsed.toISOString().slice(0,10)===s?s:'';
 }
 function normalizeProfile(value){
  const p=value&&typeof value==='object'?value:{};
  const state=text(p.state).toUpperCase(),company=text(p.company).toLowerCase();
  return{state:Object.keys(stateNames).includes(state)?state:'all',company:Object.keys(companies).includes(company)?company:'all',topics:Array.isArray(p.topics)?topics.filter(t=>p.topics.includes(t)):[],includeGeneral:p.includeGeneral!==false};
 }
 function statesFrom(value){
  const s=text(value),upper=s.toUpperCase();if(own(stateNames,upper))return[upper];
  const us=/\bU\.?S\.?\b|United States|USA|America/i.test(s);
  const matches=[];
  for(const [code,name] of Object.entries(stateNames)){
   if(code==='GA'&&!us)continue; // Georgia alone may mean the country.
   const pattern=new RegExp('(^|[^A-Za-z])('+name+')(?![A-Za-z])','gi');let found;
   while((found=pattern.exec(s))){
    const start=found.index+found[1].length,end=start+found[2].length;
    if(/^\s+County\b/i.test(s.slice(end))||/\bCounty\s+of\s+$/i.test(s.slice(0,start)))continue;
    if(code==='WA'&&/^,?\s+D\.?C\.?(?:\b|$)/i.test(s.slice(end)))continue;
    matches.push({code,start,end});
   }
  }
  // The state name Virginia inside West Virginia is not a second location.
  const codes=new Set(matches.filter(m=>!matches.some(other=>other.code!==m.code&&other.start<=m.start&&other.end>=m.end&&(other.end-other.start)>(m.end-m.start))).map(m=>m.code));
  if(/\bWashington,?\s+D\.?C\.?(?:\b|$)/i.test(s))codes.add('DC');
  return Object.keys(stateNames).filter(code=>codes.has(code));
 }
 const companyTags=value=>Object.keys(companies).filter(c=>companies[c].test(text(value)));
 const topicTags=value=>topics.filter(t=>topicRules[t].test(text(value)));
 function stable(value){
  if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
  return JSON.stringify(value);
 }
 function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');}
 function buildFeed(input={}){
  const feed=[],seen=new Set();
  function add(record){if(!record.url||!record.title||seen.has(record.id))return;seen.add(record.id);feed.push(record);}
  for(const s of Array.isArray(input.sources)?input.sources:[]){
   if(!s||typeof s!=='object')continue;
   const url=safeUrl(s.url),title=text(s.title),published=date(s.date)||date(s.year);
   const body=[s.title,s.theme,s.methods,s.finding].map(text).join(' ');
   add({id:'source:'+(text(s.id)||hash(url+'|'+title)),title,kind:'source',topics:topicTags(body),states:statesFrom(s.geography),companies:companyTags([s.title,s.authors,s.institution].map(text).join(' ')),date:published,dateLabel:published?'Published '+published:'Publication date not stated',checked:date(s.accessed),summary:text(s.finding)||text(s.methods),limit:text(s.limitations),url,phase:'Not applicable · publication',evidenceStatus:text(s.type)});
  }
  const supplement=input.supplement&&typeof input.supplement==='object'?input.supplement:{};
  // These place tags come from the reviewed supplement's project boundaries,
  // not from guessing states from publication titles or author affiliations.
  const supplementPlaces={qiang2026:['MS','TN'],stlouis:['MO']};
  const supplementCompanies={qiang2026:['xai'],gauld2026:['xai'],'aws-built':['amazon']};
  const sourceUrls=new Set(feed.filter(r=>r.kind==='source').map(r=>r.url));
  function addSupplement(s,group){
   if(!s||typeof s!=='object')return;
   const url=safeUrl(s.url);if(!url||sourceUrls.has(url))return;
   const agreement=group==='agreement',title=text(s.title)||text(s.place),published=date(s.date);
   const body=[title,s.finding,s.limit,s.status].map(text).join(' ');
   const record={id:'supplement:'+group+':'+(text(s.id)||hash(url+'|'+title)),title,kind:agreement?'filing':'source',topics:agreement?[...new Set(['community',...topicTags(body)])]:topicTags(body),states:own(supplementPlaces,s.id)?[...supplementPlaces[s.id]]:[],companies:own(supplementCompanies,s.id)?[...supplementCompanies[s.id]]:companyTags([title,s.authors].map(text).join(' ')),date:published,dateLabel:published?(agreement?'Announcement dated ':'Published ')+published:'Publication date not stated',checked:date(supplement.reviewed),summary:[s.display,s.finding,s.recipient?'Recipient: '+text(s.recipient):''].map(text).filter(Boolean).join(' · '),limit:text(s.limit)||text(s.limitations),url,phase:agreement?(text(s.phase)||'Not established in this record'):'Not applicable · '+(group==='equipment'?'equipment reference':'publication'),evidenceStatus:text(s.status)||'Government guidance'};
   add(record);sourceUrls.add(url);
  }
  for(const s of Array.isArray(supplement.publications)?supplement.publications:[])addSupplement(s,'publication');
  for(const s of Array.isArray(supplement.equipment)?supplement.equipment:[])addSupplement(s,'equipment');
  for(const s of Array.isArray(supplement.agreements)?supplement.agreements:[])addSupplement(s,'agreement');
  if(supplement.negotiationSource)addSupplement(supplement.negotiationSource,'guidance');
  const filings=input.filings&&typeof input.filings==='object'?input.filings:{};
  for(const r of Array.isArray(filings.records)?filings.records:[]){
   if(!r||typeof r!=='object')continue;
   const url=safeUrl(r.url),title=text(r.title)||[r.project,r.recordType].map(text).filter(Boolean).join(' · '),published=date(r.publishedDate)||date(r.filedDate);
   const phase=text(r.projectPhase),knownPhase=phase&&!/^unknown|not.verified|not.established$/i.test(phase);
   add({id:'filing:'+(text(r.id)||hash([url,r.docket,r.recordType].map(text).join('|'))),title,kind:'filing',topics:topicTags([title,r.summary,r.recordType].map(text).join(' ')),states:statesFrom(r.state),companies:companyTags([r.operator,r.project,r.title].map(text).join(' ')),date:published,dateLabel:published?'Record published '+published:'Publication date not stated',checked:date(r.accessedDate)||date(filings.snapshotDate),summary:text(r.summary),limit:[r.limitations,r.nextEvidence].map(text).filter(Boolean).join(' '),url,phase:knownPhase?phase:'Not established in this record',deadline:date(r.commentDeadline),evidenceStatus:text(r.status)||text(r.evidenceType)});
  }
  const money=input.money&&typeof input.money==='object'?input.money:{};
  for(const p of Array.isArray(money.projects)?money.projects:[]){
   if(!p||typeof p!=='object')continue;
   for(const r of Array.isArray(p.records)?p.records:[]){
    if(!r||typeof r!=='object')continue;
    const sourceIds=Array.isArray(r.sources)?r.sources:[],sources=sourceIds.map(id=>own(money.sources,id)?money.sources[id]:null).filter(Boolean);
    const source=sources.find(s=>safeUrl(s.url));if(!source)continue;
    const published=date(source.date),title=[p.name,r.title].map(text).filter(Boolean).join(' · ');
    add({id:'payment:'+(text(p.id)||hash(text(p.name)))+':'+(text(r.id)||hash(title+'|'+text(r.period))),title,kind:'payment',topics:[...new Set(['community',...topicTags([r.title,r.category,r.scope].map(text).join(' '))])],states:statesFrom(p.state),companies:companyTags([p.name,r.payer].map(text).join(' ')),date:published,dateLabel:(published?'Source dated '+published:'Source date not stated')+(r.period?' · '+text(r.period):''),checked:date(money.reviewed),summary:[r.display,r.statusLabel,r.scope,r.payer?'Payer: '+text(r.payer):'',r.recipient?'Recipient: '+text(r.recipient):''].map(text).filter(Boolean).join(' · '),limit:text(r.limit),url:safeUrl(source.url),phase:text(p.phase)||'Not established in this record',evidenceStatus:text(r.statusLabel)||text(r.status)});
   }
  }
  for(const r of Array.isArray(input.events)?input.events:[]){
   if(!r||typeof r!=='object')continue;
   const title=text(r.title),url=safeUrl(r.url),published=date(r.date);
   add({id:'event:'+(text(r.id)||hash(url+'|'+title+'|'+published)),title,kind:'event',topics:[...new Set(['community',...topicTags([title,r.kind,r.detail].map(text).join(' '))])],states:statesFrom(r.state),companies:companyTags([title,r.detail].map(text).join(' ')),date:published,dateLabel:published?'Recorded event date '+published:'Event date not stated',checked:date(r.checked),summary:[r.kind,r.time,r.where,r.detail].map(text).filter(Boolean).join(' · '),limit:[r.phaseNote,'Check the latest official notice. A recorded event date does not establish that participation is still open.'].map(text).filter(Boolean).join(' '),url,phase:text(r.phase)||'Not established in this record',deadline:published,evidenceStatus:text(r.kind)});
  }
  return feed;
 }
 function filter(records,profile){
  const p=normalizeProfile(profile);return(Array.isArray(records)?records:[]).filter(r=>{
   if(p.state!=='all'&&!(Array.isArray(r.states)&&r.states.includes(p.state))&&!(p.includeGeneral&&(!r.states||r.states.length===0)))return false;
   if(p.company!=='all'&&!(Array.isArray(r.companies)&&r.companies.includes(p.company)))return false;
   return !p.topics.length||(Array.isArray(r.topics)&&p.topics.some(t=>r.topics.includes(t)));
  });
 }
 function fingerprint(record){
  const r=record&&typeof record==='object'?record:{};
  const values={};for(const k of ['id','title','kind','date','dateLabel','summary','limit','url','phase','deadline','evidenceStatus'])values[k]=text(r[k]);
  for(const k of ['states','companies','topics'])values[k]=Array.isArray(r[k])?[...r[k]].sort():[];
  return hash(stable(values));
 }
 function changes(records,baseline){
  const first=baseline===null||typeof baseline!=='object'||Array.isArray(baseline),result={};
  for(const r of Array.isArray(records)?records:[]){if(!r||!text(r.id))continue;result[r.id]=first?'unreviewed':!own(baseline,r.id)?'added':baseline[r.id]===fingerprint(r)?'seen':'changed';}
  return result;
 }
 return{buildFeed,filter,fingerprint,changes,normalizeProfile};
});
