/* A light, place-first doorway into the observatory's evidence. */
(() => {
  'use strict';
  const search=document.getElementById('nearby-search'),main=document.querySelector('main');
  if(!search||!main)return;
  const page=document.createElement('section');page.id='view-nearby';page.className='nm-page';page.hidden=true;
  page.innerHTML=`<header class="nm-hero"><div><p class="eyebrow">A small adventure in big computing</p><h1>Data centers<br><em>near me.</em></h1><p>The cloud has a neighborhood.<br>Let’s explore yours.</p></div>
    <figure class="nm-sculpture"><img class="nm-neighborhood" src="calder-neighborhood.svg?v=compute-art-20261018" width="540" height="370" alt="" decoding="async"><figcaption><span aria-hidden="true">&gt; </span>compute / power / place</figcaption></figure></header>
    <div id="nm-search-slot"></div><div id="nm-result-slot"></div>
    <section class="nm-tour"><div><p class="eyebrow">Make a little time to look</p><h2>Small tour.<br>Fresh eyes.</h2><p>Find a route with room to stop, look and wonder.</p><button type="button" class="btn primary" id="nm-tour-start">Find a short tour →</button><p class="nm-small">Starts at the first stop. Getting there is extra.</p></div><div class="nm-time-pieces" aria-label="Tour options: 5 minute walk, 10 minute walk or 20 minute drive"><div><b>5</b><span>min walk</span></div><div><b>10</b><span>min walk</span></div><div><b>20</b><span>min drive</span></div></div></section>
    <section class="nm-curiosity" aria-labelledby="nm-curiosity-title"><div><p class="eyebrow">You bring the curiosity</p><h2 id="nm-curiosity-title">Pick a way to explore.</h2><div class="nm-lenses" role="group" aria-label="Choose an observation prompt"><button type="button" data-lens="look" aria-pressed="true">◉ Look</button><button type="button" data-lens="listen" aria-pressed="false">≋ Listen</button><button type="button" data-lens="ask" aria-pressed="false">? Ask</button></div></div><div id="nm-prompt" class="nm-prompt" aria-live="polite" aria-atomic="true"></div></section>
    <section class="nm-deeper" aria-labelledby="nm-deeper-title"><p class="eyebrow">Follow your curiosity</p><h2 id="nm-deeper-title">There’s more behind the pin.</h2><div class="nm-evidence-links"><a href="#impact" data-view="impact"><span aria-hidden="true">↗</span><b>Follow the power</b><small>Electricity, water & climate</small></a><a href="#health" data-view="health"><span aria-hidden="true">···</span><b>Explore the air</b><small>Monitors, emissions & health</small></a><a href="#research" data-view="research"><span aria-hidden="true">?</span><b>Find the evidence</b><small>Studies, sources & open questions</small></a></div><p class="nm-small">Visit from permitted public places. A map pin is not permission to enter a facility, and proximity alone does not establish exposure.</p></section>`;
  const launcher=document.createElement('div');launcher.className='nm-ledger-link';
  launcher.innerHTML='<div><b>The cloud has a neighborhood.</b><p>Find nearby places, then come back to their public records.</p></div><button type="button" class="btn primary" data-nearby>Data centers near me ↗</button>';
  search.before(launcher);
  const directories=search.querySelector('.nearby-directory-links'),form=document.getElementById('zip-form'),result=document.getElementById('zip-result');
  search.replaceChildren();search.className='nm-search';
  const heading=document.createElement('div');heading.className='nm-search-heading';heading.innerHTML='<p class="eyebrow">Five digits. Start exploring.</p><h2>Start with your ZIP.</h2>';
  search.append(heading,form);page.querySelector('#nm-search-slot').append(search);page.querySelector('#nm-result-slot').append(result);
  main.insertBefore(page,main.querySelector(':scope>section'));
  document.getElementById('zip-code').placeholder='Your ZIP';document.getElementById('zip-submit').textContent='Find nearby ↗';
  const example=document.createElement('button');example.type='button';example.className='nm-example';example.textContent='Just browsing? Try Albuquerque · 87102';
  example.onclick=()=>{const input=document.getElementById('zip-code');input.value='87102';input.dispatchEvent(new Event('input'));form.requestSubmit();};form.append(example);
  if(directories){const more=document.createElement('details');more.className='nm-directories';const summary=document.createElement('summary');summary.textContent='Other public-address directories';more.append(summary,directories);page.append(more);}
  function openTour(){const zip=document.getElementById('zip-code').value;view('tours');if(/^\d{5}$/.test(zip))window.dispatchEvent(new CustomEvent('footprint:tourzip',{detail:{zip}}));document.getElementById('ct-auto-zip')?.focus({preventScroll:true});}
  const quickTour=document.createElement('button');quickTour.type='button';quickTour.className='btn nm-zip-tour';quickTour.textContent='Build my neighborhood tour →';
  quickTour.onclick=()=>{const input=document.getElementById('zip-code');if(!/^\d{5}$/.test(input.value)){document.getElementById('zip-status').textContent='Enter all five ZIP digits to find a tour.';input.setAttribute('aria-invalid','true');input.focus();return;}openTour();};
  const tourHint=document.createElement('p');tourHint.className='nm-tour-hint';tourHint.textContent='5 or 10 min walk · 20 min drive · time to look included';
  form.querySelector('.zip-entry').after(quickTour,tourHint);
  page.querySelector('#nm-tour-start').onclick=openTour;window.addEventListener('footprint:neighborhoodtour',openTour);
  const prompts={look:{title:'What shares the block?',text:'Look for homes, schools, shops and green space. Notice the neighborhood around the building—not just the building itself.',view:'community',link:'Turn an observation into a question →'},listen:{title:'What can you hear?',text:'From a permitted public place, notice traffic, fans and other sounds. Write down the time and what you hear. A listening stop is an observation, not a noise measurement.',view:'health',link:'Learn about sound & air evidence →'},ask:{title:'What would you ask the operator?',text:'How much electricity and water does this site use? Where are its permits? Pick one question, then look for a public record that could answer it.',view:'ledger',link:'Look inside the public records →'}};
  function showPrompt(key){const p=prompts[key],box=page.querySelector('#nm-prompt');box.replaceChildren();const title=document.createElement('h3'),text=document.createElement('p'),link=document.createElement('a');title.textContent=p.title;text.textContent=p.text;link.textContent=p.link;link.href='#'+p.view;link.dataset.view=p.view;box.append(title,text,link);page.querySelectorAll('[data-lens]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lens===key)));box.dataset.lens=key;}
  page.querySelectorAll('[data-lens]').forEach(b=>b.onclick=()=>showPrompt(b.dataset.lens));showPrompt('look');
  if(location.hash==='#nearby')view('nearby');
})();
