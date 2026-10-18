/* Short, sourced learning examples. No facility rating, tracking, or network calls. */
(() => {
  'use strict';
  const mount=document.getElementById('nm-claim-check');if(!mount)return;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rounds=[
    {
      topic:'I / Clean power',claim:'“100% renewable. Every hour is covered.”',
      evidence:[['Annual electricity use','100 MWh'],['Annual renewable certificates','100 MWh'],['Hourly supply records','Not provided']],
      question:'Do those annual totals establish clean power every hour?',
      choices:['Yes, every hour is covered','No, the hourly evidence is missing','Yes, the site is off-grid'],correct:1,
      headline:'A year is not an hour.',
      explanation:'Annual matching can support renewable procurement, but these totals do not establish hourly supply or zero physical emissions. Ask when and where power is supplied, and include backup generation.',
      graphic:'<div class="cc-equation" aria-label="Annual matching does not establish hourly matching"><span>1 year</span><b aria-hidden="true">≠</b><span>every hour</span></div>',
      request:'Please publish hourly electricity use and supply matching, grid-emissions estimates, and backup-generator fuel use and emissions.',
      source:'EPA · 24/7 hourly matching',url:'https://www.epa.gov/green-power-markets/247-hourly-matching-electricity'
    },
    {
      topic:'I / Energy savings',claim:'“Cooling uses 40% less energy.”',
      evidence:[['Before: cooling','20 energy units'],['Before: everything else','80 energy units'],['After: cooling','12 energy units']],
      context:'Illustrative annual totals. The same service is delivered; all other energy use stays at 80 units.',
      question:'How much does total facility energy fall?',
      choices:['8% less overall','40% less overall','20% less overall'],correct:0,
      headline:'A real saving. A smaller whole-building number.',
      explanation:'Total energy falls from 100 to 92 units: 8% less. Cooling falls from 20 to 12 units: 40% less. Both are useful results, but they describe different boundaries. These are teaching numbers, not a measured facility.',
      graphic:'<div class="cc-bars" role="img" aria-label="Whole-facility energy: before 100 units; after 92 units"><div><span>Before · 100</span><i style="--cc-bar:100%"></i></div><div><span>After · 92</span><i style="--cc-bar:92%"></i></div></div>',
      request:'Please report cooling electricity and total facility electricity separately, with the baseline, reporting period and comparable service levels.',
      source:'DOE · facility energy and cooling metrics',url:'https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers'
    },
    {
      topic:'N / Water & growth',claim:'“We use less water per unit of IT electricity.”',
      evidence:[['Year 1: water intensity','0.8 liters / kWh IT'],['Year 2: water intensity','0.5 liters / kWh IT'],['IT electricity, year 1 → 2','10 → 20 million kWh']],
      context:'Illustrative years with the same site-water accounting boundary. Compare the total as well as the ratio.',
      question:'What happens to total annual site water use?',
      choices:['It falls because efficiency improves','It stays the same','It rises by 25%'],correct:2,
      headline:'Efficiency improves. Total water use rises.',
      explanation:'Year 1: 0.8 × 10 million = 8 million liters. Year 2: 0.5 × 20 million = 10 million liters. That is 25% more water as IT electricity use doubles. Lower intensity alone does not establish lower total use.',
      graphic:'<div class="cc-bars" role="img" aria-label="Annual site water: year 1, 8 million liters; year 2, 10 million liters"><div><span>Year 1 · 8 million L</span><i style="--cc-bar:80%"></i></div><div><span>Year 2 · 10 million L</span><i style="--cc-bar:100%"></i></div></div>',
      request:'Please report annual water withdrawals and consumptive use separately, alongside water intensity, total IT electricity, peak water demand and drought limits.',
      source:'DOE · water usage effectiveness',url:'https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers'
    }
  ];
  let index=0,answered=null;
  mount.innerHTML='<details class="cc-game" id="claim-check"><summary><span class="cc-seal" aria-hidden="true">?</span><span><strong>Claim Check</strong><small>Three claims. One minute. A sharper question.</small></span><span class="cc-play">Play ↗</span></summary><div class="cc-body" id="cc-body"></div></details>';
  const body=mount.querySelector('#cc-body'),$=id=>mount.querySelector('#'+id);
  function focus(element){element.focus({preventScroll:true});element.scrollIntoView({block:'nearest',behavior:'instant'});}
  function renderRound(moveFocus=false){
    answered=null;const round=rounds[index];
    body.innerHTML=`<div class="cc-topline"><span>${escape(round.topic)}</span><span id="cc-progress">${index+1} / ${rounds.length}</span></div>
      <p class="cc-note">Illustrative claims, not findings about a named facility.</p>
      <blockquote class="cc-claim">${escape(round.claim)}</blockquote>
      <dl class="cc-evidence">${round.evidence.map(([label,value])=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
      ${round.context?`<p class="cc-context">${escape(round.context)}</p>`:''}
      <h3 id="cc-round" tabindex="-1">${escape(round.question)}</h3>
      <div class="cc-choices" role="group" aria-labelledby="cc-round">${round.choices.map((choice,i)=>`<button type="button" data-answer="${i}"><span aria-hidden="true">${String.fromCharCode(65+i)}</span>${escape(choice)}</button>`).join('')}</div>
      <section id="cc-feedback" class="cc-feedback" aria-label="Answer and evidence" tabindex="-1" hidden></section>
      <button type="button" class="btn primary cc-next" id="cc-next" hidden>${index===rounds.length-1?'Take your questions →':'Next claim →'}</button>`;
    if(moveFocus)focus($('cc-round'));
  }
  function reveal(choice){
    if(answered!==null)return;answered=choice;
    const round=rounds[index],correct=choice===round.correct;
    body.querySelectorAll('[data-answer]').forEach(button=>{button.disabled=true;button.dataset.result=Number(button.dataset.answer)===round.correct?'correct':Number(button.dataset.answer)===choice?'selected':'';});
    const feedback=$('cc-feedback');feedback.hidden=false;
    feedback.innerHTML=`<p class="cc-verdict">${correct?'You found the distinction.':'Here’s the distinction.'}</p><h4>${escape(round.headline)}</h4>${round.graphic}<p>${escape(round.explanation)}</p><a href="${escape(round.url)}" target="_blank" rel="noopener">${escape(round.source)} ↗</a><div class="cc-ask"><b>A question to take with you</b><p>${escape(round.request)}</p></div>`;
    $('cc-next').hidden=false;focus(feedback);
  }
  const questionsText=()=>['CLAIM CHECK — Questions for a data-center project','Adapt these questions to the project and decision you are reviewing.','',...rounds.map((round,i)=>`${i+1}. ${round.request}\nMethod: ${round.url}`)].join('\n\n');
  function complete(){
    body.innerHTML=`<p class="cc-topline">3 / 3 claims explored</p><h3 id="cc-complete" tabindex="-1">Take a better question<br>into the room.</h3><p>You checked the timing, the boundary and the total. Keep these questions for your project.</p><ol class="cc-takeaways">${rounds.map(round=>`<li>${escape(round.request)}</li>`).join('')}</ol><div class="cc-actions"><button type="button" class="btn primary" id="cc-copy">Copy my questions</button><a class="btn" href="#citizen" data-view="citizen">Open public-comment guide ↗</a><button type="button" class="btn" id="cc-replay">Play again</button></div><p id="cc-copy-status" role="status"></p><textarea id="cc-copy-text" rows="10" readonly aria-label="Questions to select and copy" hidden></textarea><p class="cc-note">Learning progress is not a facility rating or a BINGO verification. Sources checked October 18, 2026.</p>`;
    focus($('cc-complete'));
  }
  mount.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||!mount.contains(button))return;
    if(button.dataset.answer!==undefined){reveal(Number(button.dataset.answer));return;}
    if(button.id==='cc-next'&&answered!==null){index++;if(index<rounds.length)renderRound(true);else complete();return;}
    if(button.id==='cc-replay'){index=0;renderRound(true);return;}
    if(button.id==='cc-copy'){
      const status=$('cc-copy-status'),fallback=$('cc-copy-text'),text=questionsText();
      try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(text);status.textContent='Questions copied. Adapt them to your project before using them.';}
      catch{fallback.value=text;fallback.hidden=false;status.textContent='Select and copy your questions below.';fallback.focus();fallback.select();}
    }
  });
  renderRound();
})();
