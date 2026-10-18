/* Named construction/planned records share the headline count collector's deduplication. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.CitizenProjects=api;api.mount();}})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const STATES='AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR'.split(' ');
function valid(data,now=Date.now()){
 if(data?.schema_version!==1||!Array.isArray(data.records)||data.records.length>10000||!data.counts)return false;
 const time=Date.parse(data.observed_at);if(!Number.isFinite(time)||time>now+60000)return false;
 const ids=new Set(),counts={construction:0,planned:0};
 for(const r of data.records){
  if(!r||!['id','company','name','stateCode','status'].every(k=>typeof r[k]==='string'&&r[k].trim()&&r[k].length<=500)||!STATES.includes(r.stateCode)||!Object.hasOwn(counts,r.status)||ids.has(r.id))return false;
  ids.add(r.id);counts[r.status]++;
 }
 return Object.keys(counts).every(k=>Number.isInteger(data.counts[k])&&data.counts[k]===counts[k]);
}
function filter(records,{phase='all',state='all',search=''}={}){
 const query=search.trim().toLowerCase();
 return records.filter(r=>(phase==='all'||r.status===phase)&&(state==='all'||r.stateCode===state)&&(!query||[r.name,r.company,r.stateCode].join(' ').toLowerCase().includes(query)));
}
function mount(){
 const scope=document.getElementById('citizen-scope');if(!scope)return;
 const $=id=>document.getElementById(id),make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const stateNames=new Map(typeof DATA==='undefined'?[]:DATA.states.map(s=>[s.abbreviation,s.name]));stateNames.set('DC','Washington, D.C.');stateNames.set('PR','Puerto Rico');
 const phaseName=r=>r.status==='construction'?'Reported construction':'Reported planned';
 const name=r=>(r.name.toLowerCase()===r.company.toLowerCase()||r.name.toLowerCase().startsWith(r.company.toLowerCase()+' '))?r.name:r.company+' · '+r.name;
 const option=(parent,value,label)=>{const e=make('option',label);e.value=value;parent.append(e);return e;};
 const box=make('div',undefined,'citizen-picker');scope.before(box);scope.hidden=true;document.querySelector('label[for="citizen-scope"]').hidden=true;
 box.innerHTML='<div class="citizen-picker-heading"><h3>Find your project.</h3><span>Construction + planned</span></div><div id="citizen-project-totals" class="citizen-project-totals" aria-live="polite"></div><div class="citizen-project-filters"><div><label for="citizen-project-state">State / territory</label><select id="citizen-project-state"></select></div><div><label for="citizen-project-phase">Reported phase</label><select id="citizen-project-phase"><option value="construction">Under construction</option><option value="planned">Planned</option><option value="all">Construction + planned</option></select></div></div><label for="citizen-project-search">Search name or operator</label><input id="citizen-project-search" type="search" maxlength="160" placeholder="e.g. Amazon, Meta, Las Cruces" autocomplete="off"><label for="citizen-project-select">Which project?</label><select id="citizen-project-select" aria-describedby="citizen-project-matches"></select><p id="citizen-project-matches" class="citizen-small" role="status"></p><div class="citizen-project-refresh"><p id="citizen-project-freshness" class="citizen-small">Loading named projects…</p><button id="citizen-project-refresh" type="button" class="btn">Check for updates ↻</button></div><details class="citizen-project-method"><summary>What does this list establish?</summary><p>Names, operators, states and phases are reported by <a href="https://usdatamap.com/" target="_blank" rel="noopener noreferrer">USDataMap ↗</a>. These are directory records; campuses and individual facilities may be mixed. A construction label does not establish that a comment period is open. Confirm the particular decision in an official notice.</p><p>Planned and construction are separate categories. The original 63 was an older planned count. Filters apply to the directory; the reviewed Jasper guide and manual entry remain available. Missing records do not prove no projects exist, including in Puerto Rico.</p></details>';
 const select=$('citizen-project-select'),state=$('citizen-project-state'),phase=$('citizen-project-phase'),search=$('citizen-project-search');
 option(state,'all','All states & territories');for(const code of STATES.slice().sort((a,b)=>(stateNames.get(a)||a).localeCompare(stateNames.get(b)||b)))option(state,code,stateNames.get(code)||code);
 const context=make('div',undefined,'citizen-project');context.id='citizen-directory-choice';context.hidden=true;$('citizen-other').before(context);
 let data=null,selected=null,selection='jasper',busy=false;
 function draw(){
  const matches=filter(data?.records||[],{phase:phase.value,state:state.value,search:search.value}).sort((a,b)=>a.stateCode.localeCompare(b.stateCode)||name(a).localeCompare(name(b)));
  select.replaceChildren();
  const guide=make('optgroup');guide.label='Reviewed permit guide / enter your own';select.append(guide);
  option(guide,'jasper','Amazon · Wheatfield, IN · reviewed air-permit guide');option(guide,'other','My project is not listed · enter it myself');
  if(selected&&!matches.some(r=>r.id===selected.id)){const group=make('optgroup');group.label='Your selection (outside these results)';select.append(group);option(group,selection,name(selected)+' · '+selected.stateCode+' · '+phaseName(selected));}
  for(const status of ['construction','planned']){const rows=matches.filter(r=>r.status===status);if(!rows.length)continue;const group=make('optgroup');group.label=(status==='construction'?'Reported construction':'Reported planned')+' · '+rows.length;select.append(group);for(const r of rows)option(group,'directory:'+r.id,name(r)+' · '+r.stateCode);}
  select.value=selection;
  $('citizen-project-matches').textContent=data?(matches.length?matches.length+' directory matches. Choose a project above to fill its name and state.':'No directory matches for these filters. Try another phase, clear the search, or enter your project yourself.'):'The reviewed Jasper guide and manual entry are available while the directory loads.';
  if(data){const totals=$('citizen-project-totals');totals.replaceChildren();for(const [key,label]of [['construction','Reported construction'],['planned','Reported planned']]){const item=make('div');item.append(make('strong',data.counts[key].toLocaleString()),make('span',label));totals.append(item);}}
 }
 function choose(){
  selection=select.value;selected=data?.records.find(r=>'directory:'+r.id===selection)||null;
  scope.value=selection==='jasper'?'jasper':'other';
  $('citizen-project-name').value=selected?name(selected):'';
  $('citizen-place').value=selected?(stateNames.get(selected.stateCode)||selected.stateCode):'';
  $('citizen-permit').value='';
  scope.dispatchEvent(new Event('change',{bubbles:true}));
  context.replaceChildren();context.hidden=!selected;
  if(selected){const stamp=make('span',phaseName(selected),'citizen-tag'),heading=make('h3',name(selected)),location=make('p',stateNames.get(selected.stateCode)||selected.stateCode),note=make('p','Project name and state filled below. Confirm the city/county, permit number, recipient and deadline in the official record. No project-specific emissions finding is inserted.','citizen-small');
   context.append(stamp,heading,location,note);const source=make('a','Directory source ↗');source.href='https://usdatamap.com/';source.target='_blank';source.rel='noopener noreferrer';context.append(source,make('small',' · Phase observed '+data.observed_at.slice(0,10)));
  }
 }
 select.addEventListener('change',choose);state.addEventListener('change',draw);phase.addEventListener('change',draw);search.addEventListener('input',draw);
 window.addEventListener('footprint:citizen-reset',()=>{selection='jasper';selected=null;state.value='all';phase.value='construction';search.value='';context.hidden=true;draw();});
 async function fetchCatalog(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Unavailable');const d=await r.json();if(!valid(d))throw Error('Invalid project catalog');if(!data||Date.parse(d.observed_at)>Date.parse(data.observed_at)){data=d;draw();}return d;}
 function freshness(message){$('citizen-project-freshness').textContent=(data?'Directory observed '+new Date(data.observed_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})+'. '+(Date.now()-Date.parse(data.observed_at)>48*3600000?'Older than 48 hours. ':''):'')+message;}
 async function refresh(initial=false){if(busy)return;busy=true;$('citizen-project-refresh').disabled=true;try{
  if(initial)try{await fetchCatalog('data-center-projects.json');freshness('Saved snapshot loaded.');}catch{}
  // Same public main-branch feed pattern as the headline counts; packaged data stays usable during outages.
  try{await fetchCatalog('https://raw.githubusercontent.com/clinical-trials/datacenter/main/site/data-center-projects.json');freshness('Saved feed checked. Your selection and text are kept.');}
  catch{freshness(data?'Showing the saved snapshot; a newer feed is unavailable.':'Directory unavailable. Use the reviewed guide or enter a project yourself.');}
 }finally{busy=false;$('citizen-project-refresh').disabled=false;}}
 $('citizen-project-refresh').onclick=()=>refresh();draw();refresh(true);
 const timer=setInterval(()=>{if(!document.hidden)refresh();},300000);window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 return {refresh};
}
return {valid,filter,mount};
});
