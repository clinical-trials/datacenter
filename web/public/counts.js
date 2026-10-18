(()=>{'use strict';
 const section=document.querySelector('.center-counts');if(!section)return;
 const host=document.getElementById('count-history'),status=document.getElementById('count-update-status'),breakdown=document.getElementById('count-state-breakdown');
 const phases=[['operating','Reported operating'],['under_construction','Reported construction'],['planned','Reported planned']];
 const FEED='https://raw.githubusercontent.com/clinical-trials/datacenter/main/site/data-center-counts.json',CACHE='footprint-counts-v2';
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const stamp=row=>new Date(row.observed_at||row.date+'T12:00:00Z').toLocaleString(undefined,{dateStyle:'medium',...(row.observed_at?{timeStyle:'short'}:{})});
 let rows=[],busy=false,selectedPlanned='US',lastCheck=null;
 const controls=el('div');controls.className='count-live-controls';
 const badge=el('span','Loading observations');badge.className='count-freshness';
 const refreshButton=el('button','Check latest counts ↻');refreshButton.type='button';refreshButton.className='btn';
 const cadence=el('small','Daily source checks · page refreshes every 5 minutes');controls.append(badge,refreshButton,cadence);status.before(controls);
 const plannedPanel=el('div');plannedPanel.className='planned-state-panel';section.querySelector('.count-grid').after(plannedPanel);
 const plannedLabel=el('label','Planned projects · choose a state');plannedLabel.htmlFor='planned-state-select';
 const plannedSelect=el('select');plannedSelect.id='planned-state-select';plannedSelect.setAttribute('aria-describedby','planned-state-note');
 const stateNames=new Map(DATA.states.filter(s=>s.abbreviation!=='US').map(s=>[s.abbreviation,s.name]));stateNames.set('PR','Puerto Rico');stateNames.set('DC','Washington, D.C.');
 for(const [code,name] of [['US','All reported locations'],...[...stateNames].sort((a,b)=>a[1].localeCompare(b[1]))]){const option=el('option',name);option.value=code;plannedSelect.append(option);}
 const plannedResult=el('div');plannedResult.className='planned-state-result';plannedResult.setAttribute('aria-live','polite');plannedResult.setAttribute('aria-atomic','true');
 const plannedNumber=el('strong','—'),plannedDescription=el('span','Loading latest snapshot…');plannedResult.append(plannedNumber,plannedDescription);
 const plannedNote=el('small','Directory-reported plans, not verified approvals. Missing state data do not mean zero projects.');plannedNote.id='planned-state-note';plannedNote.className='planned-state-note';
 plannedPanel.append(plannedLabel,plannedSelect,plannedResult,plannedNote);
 function updatePlanned(){const latest=rows[0];if(!latest)return;const known=selectedPlanned==='US'||Object.hasOwn(latest.planned_by_state||{},selectedPlanned);const count=selectedPlanned==='US'?latest.planned:latest.planned_by_state?.[selectedPlanned];const name=selectedPlanned==='US'?'all reported locations':stateNames.get(selectedPlanned);plannedNumber.textContent=known?count.toLocaleString():'—';plannedDescription.textContent=known?(count===1?'planned project':'planned projects')+' · '+name:'State count unavailable · '+name;}
 plannedSelect.onchange=()=>{selectedPlanned=plannedSelect.value;updatePlanned();};
 const deltas=[...section.querySelectorAll('.count-grid>div')].map(card=>{const d=el('small');d.className='count-change';card.append(d);return d;});
 const sourceLine=el('p');sourceLine.className='count-caption count-source';status.after(sourceLine);
 function render(){
  const latest=rows[0];if(!latest)return;updatePlanned();const prior=CountFeed.previous(rows);
  section.querySelectorAll('.count-grid>div>strong').forEach((e,i)=>{e.textContent=latest[phases[i][0]].toLocaleString();const diff=prior?latest[phases[i][0]]-prior[phases[i][0]]:null;deltas[i].textContent=diff===null?'':diff===0?'No change':(diff>0?'+':'')+diff.toLocaleString()+' since prior check';});
  const time=section.querySelector('.count-heading time');time.dateTime=latest.observed_at||latest.date;time.textContent='Observed '+stamp(latest);
  section.querySelector('.count-caption').textContent=(latest.verification||'Unverified snapshot')+' · Directory records, not a national census or an impact score.';
  const stale=Date.now()-Date.parse(latest.observed_at||latest.date)>48*3600000;
  badge.textContent=stale?'Older observation':lastCheck?.result==='failed'?'Last good observation':'Latest saved observation';badge.dataset.stale=String(stale||lastCheck?.result==='failed');
  sourceLine.replaceChildren();const link=el('a',latest.source||'Source');try{const url=new URL(latest.source_url);if(url.protocol==='https:')link.href=url.href;}catch{}sourceLine.append(link,document.createTextNode(' · A new record or status change does not necessarily mean a new opening.'));
  breakdown.replaceChildren();if(latest.planned_by_state||latest.construction_by_state||latest.notes){const details=el('details');details.append(el('summary','Where are the planned and construction records?'));for(const [key,label] of [['planned_by_state','Planned'],['construction_by_state','Under construction']]){if(!latest[key])continue;details.append(el('h3',label+' · directory classifications'),el('p',Object.entries(latest[key]).sort((a,b)=>b[1]-a[1]).map(([s,n])=>s+': '+n).join(' · ')));}if(latest.notes)details.append(el('p',latest.notes));breakdown.append(details);}
  const wasOpen=host.querySelector('details')?.open;host.replaceChildren();const history=el('details');history.open=!!wasOpen;history.append(el('summary','Dated count history · '+rows.length+' observations'));
  history.append(el('p','Compare observations from the same directory and method. The original user-reported figures have unconfirmed coverage and are not a verified growth baseline.'));
  const max=Math.max(1,...rows.flatMap(r=>phases.map(([k])=>r[k])));
  for(const row of rows){const article=el('article');article.className='count-record';article.append(el('h3',stamp(row)));const chart=el('div');chart.className='count-chart';for(const [key,label] of phases){const item=el('div');item.className='count-bar-row';const track=el('div');track.className='count-bar-track';track.setAttribute('aria-hidden','true');const bar=el('div');bar.className='count-bar';bar.style.width=(100*row[key]/max)+'%';track.append(bar);item.append(el('span',label),track,el('strong',row[key].toLocaleString()));chart.append(item);}article.append(chart,el('p',(row.source||'Directory observation')+' · '+row.verification));history.append(article);}host.append(history);
 }
 function accept(data){
  if(!Array.isArray(data.snapshots)||!data.snapshots.length||!data.snapshots.every(r=>CountFeed.valid(r)))throw Error('Invalid feed');
  rows=CountFeed.merge(rows,data.snapshots);
  if(data.last_check&&Number.isFinite(Date.parse(data.last_check.checked_at))&&Date.parse(data.last_check.checked_at)<=Date.now()+60000&&(!lastCheck||data.last_check.checked_at>lastCheck.checked_at))lastCheck=data.last_check;
  render();try{localStorage.setItem(CACHE,JSON.stringify({snapshots:rows,last_check:lastCheck}));}catch{}
 }
 async function fetchFeed(url){const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Feed unavailable');const data=await r.json();accept(data);return data;}
 async function refresh(){
  if(busy)return;busy=true;refreshButton.disabled=true;refreshButton.textContent='Checking…';
  try{
   await fetchFeed(location.hostname==='127.0.0.1'||location.hostname==='localhost'?'data-center-counts.json':FEED);
   status.textContent=(lastCheck?'Source check: '+new Date(lastCheck.checked_at).toLocaleString()+'. ':'')+(lastCheck?.result==='failed'?'The source check failed; keeping the last successful counts. ':'')+(rows[0]&&Date.now()-Date.parse(rows[0].observed_at||rows[0].date)>48*3600000?'Observation is older than 48 hours. ':'')+'Saved feed refreshed '+new Date().toLocaleTimeString()+'.';
  }catch{
   status.textContent='Update connection unavailable. '+(rows.length?'Showing the last saved observation; its date remains visible.':'No valid observation is available.');badge.textContent='Update unavailable';badge.dataset.stale='true';
  }finally{busy=false;refreshButton.disabled=false;refreshButton.textContent='Check latest counts ↻';}
 }
 refreshButton.onclick=refresh;
 try{const cached=JSON.parse(localStorage.getItem(CACHE));if(cached)accept(cached);}catch{}
 fetchFeed('data-center-counts.json').catch(()=>{}).finally(refresh);
 setInterval(()=>{if(!document.hidden)refresh();},300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
})();
