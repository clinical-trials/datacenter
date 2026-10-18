/* A nationwide discovery layer; the separately reviewed case notes retain their evidence boundary. */
(() => {
 'use strict';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const link=(url,label)=>`<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
 window.mountNationalMoratoria=async function(root,{stateNames,reviewed,onReviewed}){
  const M=window.NationalMoratoria;
  root.innerHTML='<p role="status">Loading the nationwide directory…</p>';
  try{
   const response=await fetch('moratoria-national.json?v=nationwide-20261018');if(!response.ok)throw Error('fetch');
   const data=await response.json();if(!M.valid(data))throw Error('data');
   const number=n=>n.toLocaleString('en-US');
   const states=Object.entries(stateNames).sort((a,b)=>a[1].localeCompare(b[1]));
   const stateCount=new Set(data.records.map(r=>r.state)).size;
   const matches=r=>reviewed.find(c=>c.state===r.state&&c.jurisdiction.toLowerCase()===r.jurisdiction.toLowerCase());
   let limit=24;
   root.innerHTML=`<p class="eyebrow">Nationwide / local instruments</p>
    <div class="mn-scale"><div><strong>${number(data.records.length)}</strong><span>source-reported records</span></div><div><strong>${stateCount}</strong><span>states represented</span></div></div>
    <p class="mn-boundary"><strong>Research leads, not verified current law.</strong> This imported snapshot includes proposals and past actions. One place may have several records. Check the official ordinance before acting.</p>
    <p class="mn-source">Source: ${link(data.source.url,'Moratorium Nation · Michael J. Bommarito')} · Sept. 23, 2026 snapshot · ${link(data.source.licenseUrl,'CC BY 4.0')}.</p>
    <div class="mor-section-head"><h2 id="mor-national-find">Choose your state</h2><span>01 / Nationwide directory</span></div>
    <div class="mn-filters"><label>State or territory<select id="mn-state"><option value="all">All states &amp; territories</option>${states.map(([s,n])=>`<option value="${s}">${escape(n)}</option>`).join('')}</select></label><label>Status in the source snapshot<select id="mn-status"><option value="all">All reported statuses</option>${Object.entries(M.labels).map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select></label><label>Town, county or jurisdiction<input id="mn-search" type="search" placeholder="e.g. Denver, Pima, township" autocomplete="off"></label><button class="btn" id="mn-reset" type="button">Reset</button></div>
    <details class="mn-state-drawer"><summary>Browse all 50 states, D.C. &amp; Puerto Rico</summary><p>Numbers count imported records, including proposals and history. A dash means no entry in this import, not no moratorium.</p><div class="mn-state-grid">${states.map(([s,n])=>{const count=data.records.filter(r=>r.state===s).length;return `<button type="button" data-mn-state="${s}" aria-pressed="false" aria-label="${escape(n)}: ${count?count+' source-reported records':'no imported entry'}"><b>${s}</b><span>${count||'—'}</span></button>`;}).join('')}</div></details>
    <p id="mn-count" class="mn-result-count" role="status" aria-live="polite"></p><div id="mn-results"></div><button class="btn" id="mn-more" type="button">Show 24 more records ↓</button>
    <details class="mor-method"><summary>Sources, limits &amp; download</summary><p>${escape(data.coverage)}</p><p>The source is a working dataset built with AI-assisted research and mixed official and news evidence. Its “active” classifications are reports at the source snapshot, not an independent current-law finding. Some underlying records are older. No adoption is inferred from a scheduled hearing, and a passed endpoint only prompts a new check.</p><p>Permanent bans and statewide measures appear in our reviewed cases where documented. The two collections overlap; do not add their counts.</p><p>${escape(data.source.citation)}</p><p>${escape(data.source.changes)}</p><p>${link(data.source.csvUrl,'Pinned original CSV')} · ${link(data.source.url+'/blob/'+data.source.revision+'/docs/codebook.md','Source codebook')}</p><a href="moratoria-national.json" download>Download the attributed national index (JSON)</a></details>`;
   const $=id=>root.querySelector('#'+id);
   function card(r){const c=matches(r),passed=M.datePassed(r,window.Moratoria.today());
    return `<article class="mn-record"><div class="mn-record-head"><div><p class="mn-place">${escape(stateNames[r.state]||r.state)} / ${escape(r.level)}</p><h3>${escape(r.jurisdiction)}</h3></div><span class="mn-status">${M.labels[r.reportedStatus]}<small>source snapshot</small></span></div>
     ${r.correction?`<p class="mor-caution"><strong>Correction from an official record.</strong> ${escape(r.correction.text)} ${link(r.correction.url,'Official approval record')}</p>`:''}
     ${passed?'<p class="mor-caution">The source endpoint has passed. Recheck for extensions or replacement rules; expiration is not inferred here.</p>':''}
     <details><summary>Dates, scope &amp; source notes</summary><div class="mn-detail"><p><strong>Reported action date:</strong> ${escape(r.correction?'See the correction above; the original source date is disputed.':r.dateNote||'Not established in the source.')}</p><p><strong>Source term:</strong> ${escape(r.correction?'Do not use the source’s derived endpoint. Consult the reviewed case.':r.term||'Not established.')}</p><p><strong>Instrument / authority in the source:</strong> ${escape(r.basis||'Not specified.')}</p>${!r.correction?`<p><strong>Source status note:</strong> ${escape(r.detail)}</p>`:''}${r.flagged?'<p class="mor-caution">The source itself flags unresolved verification questions for this record.</p>':''}<p>${link(r.sourceUrl,'Read the attributed source entry')} · Record ${escape(r.id)}</p><p class="mn-source">This link opens the research dataset’s state page, which may cover several sectors. It is not the signed local ordinance. Confirm jurisdiction, scope, exemptions and later actions with the relevant clerk or planning office.</p></div></details>
     ${c?`<button type="button" class="mn-case-link" data-mn-case="${escape(c.id)}">Read our ${escape(c.jurisdiction)} case notes →</button>`:''}</article>`;
   }
   function render(){const rows=M.filter(data.records,{state:$('mn-state').value,status:$('mn-status').value,search:$('mn-search').value}).sort((a,b)=>a.state.localeCompare(b.state)||a.jurisdiction.localeCompare(b.jurisdiction));
    $('mn-count').textContent=`${number(rows.length)} matching records · showing ${Math.min(limit,rows.length)}${$('mn-state').value==='all'?'':' · '+stateNames[$('mn-state').value]}`;
    $('mn-results').innerHTML=rows.length?rows.slice(0,limit).map(card).join(''):'<div class="mor-empty"><h3>No imported record matches.</h3><p>This is a coverage gap, not evidence that no restriction exists. Clear a filter, check the reviewed cases, or consult your local ordinance register and meeting records.</p></div>';
    $('mn-more').hidden=rows.length<=limit;
    root.querySelectorAll('[data-mn-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mnState===$('mn-state').value)));
   }
   const change=()=>{limit=24;render();};
   for(const id of ['mn-state','mn-status'])$(id).addEventListener('change',change);
   $('mn-search').addEventListener('input',change);
   $('mn-reset').onclick=()=>{$('mn-state').value='all';$('mn-status').value='all';$('mn-search').value='';change();};
   $('mn-more').onclick=()=>{limit+=24;render();};
   root.addEventListener('click',event=>{const b=event.target.closest('[data-mn-state]'),c=event.target.closest('[data-mn-case]');if(b){$('mn-state').value=b.dataset.mnState;change();}if(c)onReviewed(c.dataset.mnCase);});
   render();
  }catch{root.innerHTML='<p role="alert">The national index could not load. The reviewed cases remain available.</p><button type="button" class="btn mn-retry">Try again</button>';root.querySelector('.mn-retry').onclick=()=>window.mountNationalMoratoria(root,{stateNames,reviewed,onReviewed});}
 };
})();
