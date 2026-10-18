/* A dated jurisdiction register: policies, proposals and resident responses stay distinct. */
(() => {
 'use strict';
 const main=document.querySelector('main');if(!main)return;
 const page=document.createElement('section');page.id='view-moratoria';page.className='mor-page';page.hidden=true;main.insertBefore(page,main.querySelector(':scope > section'));
 const M=window.Moratoria;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const date=s=>new Date(s+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
 const link=(url,label)=>`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
 const stateNames={...Object.fromEntries(DATA.states.filter(s=>s.abbreviation!=='US').map(s=>[s.abbreviation,s.name])),DC:'District of Columbia',PR:'Puerto Rico'};
 function card(r,now){
  const status=M.status(r,now);
  return `<article class="mor-record" data-status="${status}"><div class="mor-place"><span class="mor-region">${escape(stateNames[r.state]||r.state)} / ${escape(r.level)}</span><h3>${escape(r.jurisdiction)}</h3><span class="mor-status">${escape(M.labels[status])}</span><p class="mor-checked">Sources checked ${date(r.checked)}</p></div><div class="mor-story"><p class="mor-summary">${escape(r.summary)}</p><dl class="mor-key"><div><dt>Where it applies</dt><dd>${escape(r.scope)}</dd></div><div><dt>Time &amp; term</dt><dd>${r.actionDate?`<span>${date(r.actionDate)} · ${escape(r.actionLabel||'documented action')}</span>`:''}${escape(r.term)}</dd></div></dl>${status==='recheck'?`<p class="mor-caution"><strong>Verify a later record.</strong> Last recorded: ${escape(M.labels[r.status])}. A term, scheduled decision or 45-day review interval has passed; this site does not infer renewal, repeal or a vote result.</p>`:''}<details><summary>Local response, exceptions &amp; sources</summary><div class="mor-detail"><h4>Local response</h4><p>${escape(r.response)}</p><h4>Read the boundary</h4><p>${escape(r.exception)}</p><h4>How to take part</h4><p>${escape(r.nextStep)}</p>${r.nextDate?`<p class="mor-note">${now<=r.nextDate?'Listed next milestone':'Past listed milestone'}: ${date(r.nextDate)}. Confirm the official agenda and participation rules.</p>`:''}${r.endDate?`<p class="mor-note">Recheck by ${date(r.endDate)}. ${escape(r.endBasis)}. This is not a public-comment deadline.</p>`:''}<ul class="mor-sources">${r.sources.map(s=>`<li>${link(s.url,s.label)}<small>${escape(s.kind)} · ${escape(s.locator)}</small></li>`).join('')}</ul></div></details></div></article>`;
 }
 async function load(){
  page.innerHTML='<h1>Moratoria &amp; local response</h1><p role="status">Loading the jurisdiction records…</p>';
  try{
   const response=await fetch('moratoria.json?v=nationwide-20261018');if(!response.ok)throw Error('fetch');
   const data=await response.json();if(!M||!M.valid(data))throw Error('data');
   const states=[...new Set(data.records.map(r=>r.state))].sort((a,b)=>stateNames[a].localeCompare(stateNames[b]));
   const count=key=>data.records.filter(r=>r.status===key).length;
   page.innerHTML=`<header class="mor-hero"><div><p class="eyebrow">Act / Moratoria &amp; local response</p><h1>Local pauses.<br><em>Across the country.</em></h1></div><figure><img src="balancing-act.svg?v=halftone-shadows-20261018" alt="" width="360" height="230"><figcaption>power / place / public voice</figcaption></figure><p class="mor-intro">Explore local pauses across the country. Find the jurisdiction, then check the scope and the public record.</p><button type="button" class="btn mor-find-button" data-section="mor-national-find">Find my state ↓</button></header>
    <div class="mn-switch" role="group" aria-label="Choose record collection"><button type="button" id="mor-national-button" aria-pressed="true" aria-controls="mor-national">Nationwide directory</button><button type="button" id="mor-reviewed-button" aria-pressed="false" aria-controls="mor-reviewed">Reviewed cases</button></div><div id="mor-national"></div><div id="mor-reviewed" hidden><div class="mor-caption"><strong>${data.records.length} jurisdiction records · ${states.length} states represented</strong><span>Evidence snapshot · ${date(data.asOf)}</span></div>
    <div class="mor-status-chart" aria-label="Status of the included records at the snapshot date">${Object.entries(M.labels).filter(([key])=>key!=='recheck').map(([key,label])=>`<button type="button" class="mor-stat mor-${key}" data-mor-status="${key}" aria-label="Filter ${label.toLowerCase()}: ${count(key)} records"><strong>${count(key)}</strong><span>${label}</span><i aria-hidden="true" style="--share:${count(key)/data.records.length*100}%"></i></button>`).join('')}</div>
    <p class="mor-note">Counts describe this selected collection, not U.S. totals. A county rule may exclude its cities. A pause usually affects specified approvals, not existing operations.</p>
    <div id="mor-freshness" class="mor-caution" hidden></div>
    <section class="mor-explore" aria-labelledby="mor-find"><div class="mor-section-head"><h2 id="mor-find">Find a jurisdiction</h2><span>01 / The public record</span></div>
     <div class="mor-filters"><label>State or territory<select id="mor-state"><option value="all">All states &amp; territories</option>${Object.entries(stateNames).sort((a,b)=>a[1].localeCompare(b[1])).map(([code,name])=>`<option value="${escape(code)}">${escape(name)}</option>`).join('')}</select></label><label>Type of action<select id="mor-status"><option value="all">All actions</option>${Object.entries(M.labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label><label>Search local records<input id="mor-search" type="search" placeholder="Town, county or concern" autocomplete="off"></label><button type="button" id="mor-reset">Reset filters</button></div>
     <details class="mor-state-drawer"><summary>Browse the ${states.length} included states</summary><div class="mor-state-index" aria-label="States with included records">${states.map(code=>`<button type="button" data-mor-state="${code}" aria-pressed="false" aria-label="${escape(stateNames[code])}, ${data.records.filter(r=>r.state===code).length} included jurisdiction records"><span>${code}</span><small>${data.records.filter(r=>r.state===code).length}</small></button>`).join('')}</div></details>
     <p id="mor-result-count" class="mor-result-count" role="status" aria-live="polite"></p><div id="mor-results"></div>
    </section>
    <section class="mor-learning" aria-labelledby="mor-use-title"><div class="mor-section-head"><h2 id="mor-use-title">Make the pause count.</h2><span>02 / Questions for the next decision</span></div><p>A suggested public-interest checklist for the review period:</p><div class="mor-questions"><div><span>01</span><h3>Establish the baseline</h3><p>Ask for air, noise, water and utility-cost data before construction, with a public monitoring plan.</p></div><div><span>02</span><h3>Write measurable conditions</h3><p>Ask which limits, reporting duties and remedies would be enforceable, and by which agency.</p></div><div><span>03</span><h3>Follow the costs</h3><p>Ask who funds grid upgrades, water infrastructure and oversight, and who carries the risk if a project closes.</p></div></div><div class="mor-actions"><button type="button" data-view="citizen" class="btn">Build a public comment →</button><button type="button" data-view="community" class="btn">Plan a community baseline →</button><button type="button" data-view="vote" class="btn">Explore ballot measures →</button></div></section>
    <details class="mor-method"><summary>Coverage, status definitions &amp; download</summary><p>${escape(data.coverage)} The collection prioritizes official ordinances, legislative records, government notices and minutes checked on ${date(data.asOf)}. It is maintained as a dated research supplement, not a live legal-status feed. The review PDF retains its own cutoff.</p><dl><dt>Adopted pause</dt><dd>An official record establishes adoption of a temporary restriction; the scope and any known end condition are shown.</dd><dt>Prohibition</dt><dd>A prohibition in an adopted ordinance, distinct from a time-limited moratorium.</dd><dt>Proposed action</dt><dd>A draft or scheduled decision; no adoption is inferred.</dd><dt>Community response</dt><dd>Documented testimony, organizing or a petition. This record does not establish enactment.</dd><dt>Not in force</dt><dd>The cited measure was vetoed or set aside; read the case-specific explanation.</dd><dt>Needs a new check</dt><dd>A stated or calculated term, scheduled decision, or 45-day review interval has passed. The last documented status remains in the record. Calculated dates are review reminders, not definitive legal deadlines.</dd></dl><p>Official text controls. New amendments, litigation, exemptions or state preemption may change the result. An absence here is a research gap.</p><a href="moratoria.json" download>Download the sourced jurisdiction register (JSON)</a></details></div>`;
   let nationalLoaded=false;
   const showCollection=kind=>{
    const national=kind==='national';
    page.querySelector('#mor-national').hidden=!national;page.querySelector('#mor-reviewed').hidden=national;
    page.querySelector('#mor-national-button').setAttribute('aria-pressed',String(national));
    page.querySelector('#mor-reviewed-button').setAttribute('aria-pressed',String(!national));
    page.querySelector('.mor-find-button').dataset.section=national?'mor-national-find':'mor-find';
    if(national)loadNational();
   };
   const loadNational=()=>{
    if(nationalLoaded)return;nationalLoaded=true;
    window.mountNationalMoratoria(page.querySelector('#mor-national'),{stateNames,reviewed:data.records,onReviewed:id=>{
     const record=data.records.find(r=>r.id===id);if(!record)return;
     page.querySelector('#mor-state').value=record.state;page.querySelector('#mor-status').value='all';page.querySelector('#mor-search').value=record.jurisdiction;
     showCollection('reviewed');render();page.querySelector('#mor-find').scrollIntoView({behavior:'instant',block:'start'});
    }});
   };
   page.querySelector('#mor-national-button').onclick=()=>showCollection('national');
   page.querySelector('#mor-reviewed-button').onclick=()=>showCollection('reviewed');
   function render(){
    const now=M.today(),state=page.querySelector('#mor-state').value,kind=page.querySelector('#mor-status').value,search=page.querySelector('#mor-search').value;
    const rows=M.filter(data.records,{state,status:kind,search},now).sort((a,b)=>a.state.localeCompare(b.state)||a.jurisdiction.localeCompare(b.jurisdiction));
    const freshness=page.querySelector('#mor-freshness');freshness.hidden=M.age(now,data.asOf)<=45;
    freshness.textContent=`This ${date(data.asOf)} snapshot is more than 45 days old. Open the official records for later changes; active restrictions and proposals need a new check.`;
    page.querySelector('#mor-result-count').textContent=`${rows.length} of ${data.records.length} included jurisdiction records${state==='all'?'':' · '+stateNames[state]}`;
    page.querySelector('#mor-results').innerHTML=rows.length?rows.map(r=>card(r,now)).join(''):'<div class="mor-empty"><h3>No included record matches.</h3><p>This is a coverage gap, not evidence that there is no local restriction or community response. Try clearing a filter, then check your city or county’s ordinance register, meeting minutes and planning department.</p><button type="button" class="btn" data-view="citizen">Find documents with the Act guide →</button></div>';
    page.querySelectorAll('[data-mor-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.morState===state)));
    page.querySelectorAll('[data-mor-status]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.morStatus===kind)));
   }
   for(const id of ['mor-state','mor-status'])page.querySelector('#'+id).addEventListener('change',render);
   page.querySelector('#mor-search').addEventListener('input',render);
   page.querySelector('#mor-reset').onclick=()=>{page.querySelector('#mor-state').value='all';page.querySelector('#mor-status').value='all';page.querySelector('#mor-search').value='';render();};
   page.addEventListener('click',event=>{
    const state=event.target.closest('[data-mor-state]'),status=event.target.closest('[data-mor-status]');
    if(state){page.querySelector('#mor-state').value=state.dataset.morState;render();}
    if(status){page.querySelector('#mor-status').value=status.dataset.morStatus;render();page.querySelector('#mor-find').scrollIntoView({behavior:'instant',block:'start'});page.querySelector('#mor-status').focus({preventScroll:true});}
   });
   window.addEventListener('footprint:viewchange',e=>{if(e.detail.name==='moratoria'){render();loadNational();}});
   render();if(document.body.dataset.view==='moratoria')loadNational();
  }catch{
   page.innerHTML='<h1>Moratoria &amp; local response</h1><p role="alert">The jurisdiction register could not load. No status counts are shown.</p><p>Check your city or county’s official ordinance and meeting records, or open our source file.</p><a href="moratoria.json">Open the sourced register</a> <button type="button" class="btn" id="mor-retry">Try again</button>';
   page.querySelector('#mor-retry').onclick=load;
  }
 }
 for(const selector of ['#view-indiana','#view-california','#view-states']){
  const target=document.querySelector(selector+' > .pagehead');if(!target)continue;
  const entry=document.createElement('p');entry.className='mor-entry';entry.innerHTML='Local pauses, proposals and public response <button type="button" data-view="moratoria">Explore the jurisdiction register →</button>';target.after(entry);
 }
 window.addEventListener('hashchange',()=>{if(location.hash==='#moratoria')view('moratoria');});
 if(location.hash==='#moratoria')view('moratoria');load();
})();
