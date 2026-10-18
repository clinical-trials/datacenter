/* A light, place-first doorway into the observatory's evidence. */
(() => {
  'use strict';
  const search=document.getElementById('nearby-search'),main=document.querySelector('main');
  if(!search||!main)return;
  const page=document.createElement('section');page.id='view-nearby';page.className='nm-page';page.hidden=true;
  page.innerHTML=`<header class="nm-hero"><div><p class="eyebrow">A small adventure in big computing</p><h1>Data centers<br><em>near me.</em></h1><p>The cloud has a neighborhood.<br>Let’s explore yours.</p></div>
    <figure class="nm-sculpture"><img class="nm-neighborhood" src="calder-neighborhood.svg?v=halftone-shadows-20261018" width="540" height="370" alt="" decoding="async"><figcaption><span aria-hidden="true">&gt; </span>compute / power / environmental health</figcaption></figure></header>
    <div id="nm-search-slot"></div><div id="nm-result-slot"></div>
    <section class="nm-bingo" aria-labelledby="nm-bingo-title">
      <header class="nm-bingo-heading"><div><p class="eyebrow">The proposed community scorecard</p><h2 id="nm-bingo-title">Five safeguards.<br>Every one required.</h2></div><p class="nm-bingo-rule"><strong>5 / 5</strong><span>verified = BINGO</span></p></header>
      <p class="nm-bingo-instruction">Tap a letter. See what earns it.</p>
      <div class="nm-bingo-letters" role="group" aria-label="Explore the five BINGO safeguards">
        <button type="button" data-bingo="B" aria-pressed="true" aria-controls="nm-bingo-detail" aria-label="B — Breathing and health"><b aria-hidden="true">B</b><span>Air</span></button>
        <button type="button" data-bingo="I" aria-pressed="false" aria-controls="nm-bingo-detail" aria-label="I — Invest in clean power"><b aria-hidden="true">I</b><span>Power</span></button>
        <button type="button" data-bingo="N" aria-pressed="false" aria-controls="nm-bingo-detail" aria-label="N — Nurture nature"><b aria-hidden="true">N</b><span>Nature</span></button>
        <button type="button" data-bingo="G" aria-pressed="false" aria-controls="nm-bingo-detail" aria-label="G — Guarantee a fair deal"><b aria-hidden="true">G</b><span>Fair deal</span></button>
        <button type="button" data-bingo="O" aria-pressed="false" aria-controls="nm-bingo-detail" aria-label="O — Open the evidence"><b aria-hidden="true">O</b><span>Evidence</span></button>
      </div>
      <div id="nm-bingo-detail" class="nm-bingo-detail" aria-live="polite" aria-atomic="true"></div>
      <footer class="nm-bingo-footer"><p>No free square. No averaging.<br><span>Proposed safeguards; no facility assessed. Exploring a letter does not verify it.</span></p><a class="btn" href="data-center-bingo-proposed-v1.pdf" target="_blank" rel="noopener">Full card, rules & sources ↗ <small>PDF · 4 pages</small></a></footer>
    </section>
    <section class="nm-curiosity" aria-labelledby="nm-curiosity-title"><div><p class="eyebrow">You bring the curiosity</p><h2 id="nm-curiosity-title">Pick a way to explore.</h2><div class="nm-lenses" role="group" aria-label="Choose an observation prompt"><button type="button" data-lens="look" aria-pressed="true">◉ Look</button><button type="button" data-lens="listen" aria-pressed="false">≋ Listen</button><button type="button" data-lens="ask" aria-pressed="false">? Ask</button></div></div><div id="nm-prompt" class="nm-prompt" aria-live="polite" aria-atomic="true"></div></section>
    <section class="nm-deeper" aria-labelledby="nm-deeper-title"><p class="eyebrow">Follow your curiosity</p><h2 id="nm-deeper-title">There’s more behind the pin.</h2><div class="nm-evidence-links"><a href="#impact" data-view="impact"><span aria-hidden="true">↗</span><b>Follow the power</b><small>Electricity, water & climate</small></a><a href="#health" data-view="health"><span aria-hidden="true">···</span><b>Explore the air</b><small>Monitors, emissions & health</small></a><a href="#research" data-view="research"><span aria-hidden="true">?</span><b>Find the evidence</b><small>Studies, sources & open questions</small></a></div><p class="nm-small">Visit from permitted public places. A map pin is not permission to enter a facility, and proximity alone does not establish exposure.</p></section>`;
  const bingoGates={
    B:{title:'Breathing & health',measure:'PM₂.₅ · NO₂ · generator hours · neighborhood noise',proof:'Enforceable limits, independent measurements and corrective action. Include emergency runs and protect nearby residents and workers.',source:'EPA air-sensor guidance',url:'https://www.epa.gov/air-sensor-toolbox/frequent-questions-about-air-sensors'},
    I:{title:'Invest in clean power',measure:'Hourly clean supply · total MWh · CO₂e · energy per task',proof:'The proposed target: 100% hourly clean-power matching. Count cooling, backup power and storage losses; annual certificates alone do not earn this letter.',source:'EPA hourly-matching guidance',url:'https://www.epa.gov/green-power-markets/247-hourly-matching-electricity'},
    N:{title:'Nurture nature',measure:'Water withdrawn & consumed · peak use · equipment destinations',proof:'Meet a locally reviewed water budget, conserve during drought and trace equipment to documented reuse or certified recycling.',source:'DOE data-center water efficiency',url:'https://www.energy.gov/cmei/femp/cooling-water-efficiency-opportunities-federal-data-centers'},
    G:{title:'Guarantee a fair deal',measure:'Upfront $ · annual $ × years · subsidies · costs paid',proof:'Binding agreements assign attributable infrastructure costs to the operator. Verify payments and fund independent monitoring and remedies.',source:'DOE electricity rates for large loads',url:'https://www.energy.gov/policy/articles/electricity-rate-designs-large-loads-evolving-practices-and-opportunities'},
    O:{title:'Open the evidence',measure:'Public records · reporting delays · independent review',proof:'Publish dated, source-linked results and uncertainties. Every safeguard needs independent verification; missing evidence cannot earn a letter.',source:'Full proposed rules & bibliography (PDF)',url:'data-center-bingo-proposed-v1.pdf'}
  };
  function showBingo(letter){
    const gate=bingoGates[letter],box=page.querySelector('#nm-bingo-detail');
    const title=document.createElement('h3'),measure=document.createElement('p'),proof=document.createElement('p'),source=document.createElement('a');
    title.textContent=gate.title;measure.textContent=gate.measure;measure.className='nm-bingo-metrics';proof.textContent=gate.proof;
    source.textContent=gate.source+' ↗';source.href=gate.url;source.target='_blank';source.rel='noopener';
    box.replaceChildren(title,measure,proof,source);
    page.querySelectorAll('[data-bingo]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bingo===letter)));
  }
  page.querySelectorAll('[data-bingo]').forEach(button=>button.onclick=()=>showBingo(button.dataset.bingo));showBingo('B');
  const launcher=document.createElement('div');launcher.className='nm-ledger-link';
  launcher.innerHTML='<div><b>The cloud has a neighborhood.</b><p>Find nearby places, then come back to their public records.</p></div><button type="button" class="btn primary" data-nearby>Data centers near me ↗</button>';
  search.before(launcher);
  const directories=search.querySelector('.nearby-directory-links'),form=document.getElementById('zip-form'),result=document.getElementById('zip-result');
  search.replaceChildren();search.className='nm-search';
  const heading=document.createElement('div');heading.className='nm-search-heading';heading.innerHTML='<p class="eyebrow">Five digits. Start exploring.</p><h2>Start with your ZIP.</h2>';
  search.append(heading,form);page.querySelector('#nm-search-slot').append(search);page.querySelector('#nm-result-slot').append(result);
  main.insertBefore(page,main.querySelector(':scope>section'));
  document.getElementById('zip-code').placeholder='Your ZIP';document.getElementById('zip-submit').textContent='Find nearby ↗';
  if(directories){const more=document.createElement('details');more.className='nm-directories';const summary=document.createElement('summary');summary.textContent='Other public-address directories';more.append(summary,directories);page.append(more);}
  function openTour(){const zip=document.getElementById('zip-code').value;view('tours');if(/^\d{5}$/.test(zip))window.dispatchEvent(new CustomEvent('footprint:tourzip',{detail:{zip}}));document.getElementById('ct-auto-zip')?.focus({preventScroll:true});}
  const quickTour=document.createElement('button');quickTour.type='button';quickTour.className='btn nm-zip-tour';quickTour.textContent='Build my neighborhood tour →';
  quickTour.onclick=()=>{const input=document.getElementById('zip-code');if(!/^\d{5}$/.test(input.value)){document.getElementById('zip-status').textContent='Enter all five ZIP digits to find a tour.';input.setAttribute('aria-invalid','true');input.focus();return;}openTour();};
  const tourHint=document.createElement('p');tourHint.className='nm-tour-hint';tourHint.textContent='5 or 10 min walk · 20 min drive · time to look included';
  form.querySelector('.zip-entry').after(quickTour,tourHint);
  window.addEventListener('footprint:neighborhoodtour',openTour);
  const prompts={look:{title:'What shares the block?',text:'Look for homes, schools, shops and green space. Notice the neighborhood around the building—not just the building itself.',view:'community',link:'Turn an observation into a question →'},listen:{title:'What can you hear?',text:'From a permitted public place, notice traffic, fans and other sounds. Write down the time and what you hear. A listening stop is an observation, not a noise measurement.',view:'health',link:'Learn about sound & air evidence →'},ask:{title:'What would you ask the operator?',text:'How much electricity and water does this site use? Where are its permits? Pick one question, then look for a public record that could answer it.',view:'ledger',link:'Look inside the public records →'}};
  function showPrompt(key){const p=prompts[key],box=page.querySelector('#nm-prompt');box.replaceChildren();const title=document.createElement('h3'),text=document.createElement('p'),link=document.createElement('a');title.textContent=p.title;text.textContent=p.text;link.textContent=p.link;link.href='#'+p.view;link.dataset.view=p.view;box.append(title,text,link);page.querySelectorAll('[data-lens]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lens===key)));box.dataset.lens=key;}
  page.querySelectorAll('[data-lens]').forEach(b=>b.onclick=()=>showPrompt(b.dataset.lens));showPrompt('look');
  if(location.hash==='#nearby')view('nearby');
})();
