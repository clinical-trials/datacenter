/* Public revenue and external costs retain their own year, geography and evidence status. */
(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    server: '<rect x="21" y="12" width="58" height="75" rx="9" fill="#c9daf7"/><path d="M29 34h42M29 54h42M29 74h42"/><circle cx="35" cy="24" r="3"/><circle cx="35" cy="44" r="3"/><circle cx="35" cy="64" r="3"/><path d="M84 7v16m-8-8h16"/>',
    county: '<path d="m12 36 38-25 38 25ZM18 84h64M24 78V42m17 36V42m18 36V42m17 36V42"/><circle cx="50" cy="27" r="4" fill="#f4c82e"/>',
    health: '<path d="M20 68C2 59 9 37 28 36c-1-24 32-27 40-8 23-9 38 19 23 32 17 17-4 26-19 23H28" fill="#efc1b7"/><path d="M27 52h6m11-10h6m12 13h6m-36 15h6m14 3h6m16-8h6" stroke-dasharray="1 5" stroke-width="6"/><path d="M18 89h48"/>',
    climate: '<circle cx="50" cy="50" r="27" fill="#f4c82e"/><path d="M50 5v10m0 70v10M5 50h10m70 0h10M18 18l8 8m48 48 8 8M18 82l8-8m48-48 8-8M31 59q19 13 38 0"/>',
    grid: '<path d="m9 46 40-32 42 32M20 40v47h60V40" fill="#f5df8b"/><path d="m53 40-17 24h14l-3 18 20-28H53Z" fill="#1748bd"/>',
    water: '<path d="M50 9C35 30 20 49 20 64a30 30 0 0 0 60 0C80 49 65 30 50 9Z" fill="#b8d3f7"/><path d="M32 63q-1 15 14 18"/>',
    learning: '<path d="m8 33 42-20 42 20-42 21ZM24 45v27q26 19 52 0V45M90 34v38" fill="#c9daf7"/>'
  };
  const art = name => `<svg class="fc-icon" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.server}</svg>`;
  const sections = {};
  for (const name of ['virginia', 'new-mexico']) {
    const section = document.createElement('section');
    section.id = 'view-' + name;
    section.className = 'fiscal-story';
    section.hidden = true;
    section.innerHTML = '<p role="status">Loading the sourced public-cost account…</p>';
    main.insertBefore(section, main.querySelector(':scope > section'));
    sections[name] = section;
    const mobile = document.getElementById('mobile-view');
    if (mobile) mobile.add(new Option(name === 'virginia' ? 'Virginia · who benefits, who pays' : 'New Mexico · incentive check', name));
  }
  document.addEventListener('click', event => {
    if (event.target.closest('.fiscal-story a[data-view], .fc-jump-links a[data-view]')) event.preventDefault();
  });
  const links = document.createElement('div');
  links.className = 'fc-jump-links';
  links.setAttribute('aria-label', 'State public-cost case studies');
  links.innerHTML = '<span>Follow the money →</span><a href="#virginia" data-view="virginia">Virginia: who benefits, who pays</a><a href="#new-mexico" data-view="new-mexico">New Mexico: the $4M claim</a>';
  document.querySelector('#view-states > .pagehead')?.after(links);

  const start = location.hash.slice(1);
  if (sections[start]) view(start);
  // Existing page navigation uses replaceState; direct hashes and browser history also work.
  window.addEventListener('hashchange', () => {
    const name = location.hash.slice(1);
    if (sections[name]) view(name);
  });

  fetch('state-costs.json?v=20261016').then(r => {
    if (!r.ok) throw new Error('Evidence file unavailable');
    return r.json();
  }).then(data => {
    const link = (id, label) => `<a href="${escape(data.sources[id].url)}" target="_blank" rel="noopener">${escape(label || data.sources[id].title)} ↗</a>`;
    const sources = ids => `<details class="fc-sources"><summary>Sources, dates & methods</summary><ol>${ids.map(id => {
      const s = data.sources[id];
      return `<li>${link(id)}<span>${escape(s.locator)} · ${escape(s.kind)}</span></li>`;
    }).join('')}</ol><p>Checked October 16, 2026. This supplement has its own dates; the scoping-review PDF retains its original cutoff.</p><a href="state-costs.json" download>Download this evidence account (JSON)</a></details>`;
    const navigation = active => `<nav class="fc-nav" aria-label="State case studies"><a href="#states" data-view="states">← All states</a><a href="#virginia" data-view="virginia" ${active === 'virginia' ? 'aria-current="page"' : ''}>Virginia</a><a href="#new-mexico" data-view="new-mexico" ${active === 'new-mexico' ? 'aria-current="page"' : ''}>New Mexico</a></nav>`;
    const flow = (from, to) => `<div class="fc-flow"><span>${from}</span><b aria-hidden="true">→</b><strong>${to}</strong></div>`;
    const billions = value => '$' + (value / 1e9).toLocaleString('en-US', {maximumFractionDigits: 2}) + 'B';
    const millions = value => '$' + (value / 1e6).toLocaleString('en-US', {maximumFractionDigits: 0}) + 'M';
    const va = data.virginia;
    sections.virginia.innerHTML = `${navigation('virginia')}
      <header class="fc-hero"><div><p class="eyebrow">Virginia / the public bargain</p><h1>Who benefits?<br><span>Who pays?</span></h1><p>Tax revenue has an address.<br>Pollution crosses the county line.</p></div><div class="fc-balance" aria-hidden="true"><svg viewBox="0 0 300 180" fill="none" stroke="#22211d" stroke-width="3"><path d="M156 0v29M39 62l216-36M57 60v40m174-68v55M95 128l111-13m-95 13v32m78-42v36"/><ellipse cx="57" cy="113" rx="35" ry="19" fill="#1748bd"/><path d="M207 89h50v45h-50z" fill="#f4c82e"/><ellipse cx="111" cy="162" rx="23" ry="12" fill="#d84c3f"/><circle cx="189" cy="161" r="16" fill="#1748bd"/></svg><span>A public balancing act</span></div></header>
      <p class="fc-status">Industry overview · ${escape(va.phase)} · Checked October 16, 2026</p>
      <div class="fc-money">
        <article class="fc-revenue"><div class="fc-kicker">01 / Money into the public budget ${art('county')}</div>${flow('Data-center property & equipment taxes', 'Loudoun County')}
          <strong class="fc-number">${billions(va.revenue.value)}</strong><p class="fc-unit">FY2027 projected annual revenue · one county</p>
          <div class="fc-budget"><div class="fc-waffle" role="img" aria-label="40 of 100 squares: data-center revenue represents 40 percent of Loudoun County’s FY2027 total budget">${Array.from({length:100}, (_,i) => `<i class="${i < va.revenue.budgetSharePercent ? 'filled' : ''}"></i>`).join('')}</div><p><b>40%</b>of the total county budget<br><span>Each square = 1 percentage point.</span></p></div>
          <div class="fc-destination">↓ Schools · public safety · local services</div><p class="fc-caption">County revenue supports public services and tax relief; the graphic does not allocate dollars among them. ${link('budget', 'County explanation')} · ${link('loudoun', 'Budget figure')}</p>
        </article>
        <article class="fc-concession"><div class="fc-kicker">02 / A tax benefit for companies ${art('server')}</div>${flow('State & local sales/use-tax exemption', 'Participating operators')}
          <strong class="fc-number">${billions(va.taxBenefit.value)}</strong><p class="fc-unit">FY2025 reported tax benefit · across Virginia</p><p>Companies retain money they would otherwise owe on eligible purchases. State and local budgets forgo that revenue.</p>
          <div class="fc-stamp">Company-reported<br>Not independently validated</div>
          <p class="fc-caption">This exemption is separate from annual local property and equipment taxes. ${link('tax', 'Tax report, Table 1')}</p>
          <details><summary>Why offer it?</summary><p>Officials compete for investment and a durable local tax base. VEDP models positive fiscal returns, using assumptions about how much investment would leave without incentives. That model does not establish a full environmental benefit.</p></details>
        </article>
      </div>
      <div class="fc-boundary"><b>Keep the accounts separate.</b> One county’s FY2027 revenue and statewide FY2025 tax benefits have different boundaries. Subtracting them would not produce a valid net return.</div>
      <div class="fc-cost-heading"><p class="eyebrow">03 / Costs beyond the company’s electricity bill</p><h2>Follow the burden.</h2><p>Companies pay their electricity bills. Pollution damages and future system costs follow other paths.</p></div>
      <div class="fc-burdens">
        <article class="fc-burden fc-health">${art('health')}<span class="fc-tag">Health · modeled</span><h3>${millions(va.health.value)}<small>2025 annual damage</small></h3>${flow('Power-generation air pollution', 'Exposed people, including outside Virginia')}<p>Mortality-risk valuation attributed to Virginia data-center electricity demand.</p><details><summary>What people actually bear</summary><p>Illness risk, lost well-being and premature mortality risk. This figure is a model valuation, not medical bills, observed deaths or a count of asthma cases. Neighborhood generator exposure needs separate monitoring.</p><p>AP4 air-pollution model; 2025 dollars. Working paper, Table 1. ${link('muller', 'Study and methods')}</p></details></article>
        <article class="fc-burden fc-climate">${art('climate')}<span class="fc-tag">Climate · modeled</span><h3>${billions(va.climate.value)}<small>from one year’s emissions</small></h3>${flow('Electricity-related greenhouse gases', 'People worldwide & future generations')}<p>Present value of future climate damage from 2025 operating electricity.</p><details><summary>Read the climate estimate</summary><p>Social-cost-of-carbon valuation in 2025 dollars; not a tax collected or compensation paid. Sensitive to emissions and valuation assumptions. ${link('muller', 'Working paper, Table 1')}</p></details></article>
        <article class="fc-burden fc-grid">${art('grid')}<span class="fc-tag">Infrastructure · conditional</span><h3>$${va.grid.low}–$${va.grid.high}<small>more / month by 2040</small></h3>${flow('New generation & transmission', 'Potential costs to other utility customers')}<p>JLARC’s 2024 scenario for a typical Dominion household, in real dollars.</p><details><summary>Who pays for the next power line?</summary><p>The study found existing rates allocated then-current service costs appropriately. Growth could still raise system costs or leave unused infrastructure. This is not today’s surcharge; later tariffs and protections can change who pays.</p><p>${link('jlarc', 'Read the cost and risk findings')}</p></details></article>
      </div>
      <p class="fc-method-note">The two pollution estimates are a working-paper model for electricity serving operating facilities in 2025. They are not a full lifecycle inventory. Colored shapes and dots are illustrative; their sizes do not encode dollars or exposure.</p>
      <div class="fc-water-note">${art('water')}<div><b>Water, noise and local asthma costs: no complete dollar account here.</b><p>Request seasonal water balances, neighborhood PM₂.₅ and NO₂, generator hours, and before/after health and noise data. Missing costs are not zero.</p></div><button class="btn" data-view="community">Plan community monitoring ↗</button></div>
      <details class="fc-explain"><summary>Why Virginia backed the industry so strongly</summary><div class="fc-reasons"><p><b>Networks already existed.</b><br>Early internet exchanges, AOL and fiber attracted more facilities. ${link('loudoun', 'History')}</p><p><b>A broader tax base.</b><br>Equipment and property taxes help fund county services. ${link('budget', 'Local finances')}</p><p><b>Construction and technical jobs.</b><br>JLARC’s example: about 1,500 workers at peak construction, about 50 operating staff for a 250,000-square-foot facility, roughly half contractors. ${link('jlarc', 'Employment context')}</p><p><b>Competition for investment.</b><br>Agencies argue predictable incentives help retain projects. The fiscal model relies on assumptions about what would happen without them. ${link('tax', 'Incentive analysis')}</p></div></details>
      <details class="fc-explain"><summary>What policy has changed?</summary><p><b>Loudoun, 2025:</b> ended by-right data-center development; future proposals require special-exception review. ${link('loudoun', 'County policy')}</p><p><b>Virginia, 2026:</b> enacted a data-center energy-consumption tax. A revenue measure does not itself demonstrate that climate or health damages are compensated. ${link('va2026', 'Enactment announcement')}</p></details>
      <section class="fc-ask"><p class="eyebrow">A stronger public bargain / policy proposals</p><h2>Make responsibility part of the deal.</h2><div><p><b>01 · Protect billpayers</b>Require project-specific infrastructure contributions and security if promised demand disappears.</p><p><b>02 · Prevent harm first</b>Set enforceable pollution, water and noise limits; fund independent monitoring before operation.</p><p><b>03 · Publish the full account</b>Show taxes received, exemptions, public spending and remaining harm by affected community.</p></div><button class="btn" data-view="citizen">Turn concerns into public comment ↗</button><p class="fc-caption">Proposed conditions, not a statement of current Virginia requirements. Host-community revenue alone does not establish a fair distribution of benefits and burdens.</p></section>
      ${sources(['loudoun','budget','tax','jlarc','muller','va2026'])}`;

    sections['new-mexico'].innerHTML = `${navigation('new-mexico')}
      <header class="fc-hero"><div><p class="eyebrow">New Mexico / check the direction of the money</p><h1>$4 million.<br><span>For whom?</span></h1><p>A workforce pledge, a tax-loss estimate<br>and a tax incentive are different things.</p></div><div class="fc-nm-art" aria-hidden="true">${art('learning')}<b>$4M</b><span>Follow the arrow ↓</span></div></header>
      <p class="fc-status">Checked October 16, 2026 · ${escape(data.newMexico.phase)}</p>
      <p class="fc-verdict"><b>Current $4M construction tax incentive: not verified.</b> The reviewed records establish the following distinctions.</p>
      <div class="fc-nm-grid">
        <article class="fc-revenue"><span class="fc-tag">Company commitment · October 2026</span><h2>$4M for education</h2>${flow('Project Jupiter / Oracle commitment', 'Local workforce development & education')}<p>Oracle describes a $4 million commitment within its community program. This is money promised toward the community, not a tax break paid to a developer.</p><p class="fc-caption">Payment, recipients and binding terms not independently verified here. ${link('oracle', 'Read the company statement')}</p></article>
        <article class="fc-concession"><span class="fc-tag">Historical proposal · not an enacted award</span><h2>Over $4M / year</h2>${flow('Potential revenue forgone', 'Local governments & property-tax beneficiaries')}<p>A 2019 fiscal analysis warned annual losses could exceed $4 million. HB 596 died. A 2021 SB 26 analysis repeated that estimate; its bill record shows no enactment.</p><p class="fc-caption">An uncertain fiscal forecast, not a fixed $4 million grant. ${link('hb596fiscal', '2019 fiscal analysis')} · ${link('hb596', 'Bill status')} · ${link('sb26fiscal', '2021 analysis')} · ${link('sb26', 'Bill record')}</p></article>
      </div>
      <section class="fc-irb"><p class="eyebrow">The tax incentive that the documents do identify</p><h2>Tax abatements through industrial revenue bonds.</h2><div class="fc-irb-flows"><div>${flow('Public tax treatment', 'Project companies')}<p>Executed Project Jupiter financing documents identify property- and gross-receipts-tax abatements.</p></div><div>${flow('Project commitments', 'County & community')}<p>Track payments separately: amount promised, legal terms, recipient and amount actually received.</p></div></div><p class="fc-boundary"><b>Bond principal ≠ tax subsidy.</b> A financing authorization is not a taxpayer check or the dollar value of forgone taxes.</p><p class="fc-caption">Series 2025A documents, November 2025, cover microgrid and related infrastructure. They acknowledge litigation. Aggregate tax savings, complete campus terms and current litigation outcomes are not established in this summary. ${link('irb', 'Read the executed documents')}</p></section>
      <section class="fc-ask"><p class="eyebrow">What residents can check next</p><h2>Promises need receipts.</h2><div><p><b>Tax benefits</b>Request annual abatement values, affected public budgets and payment-in-lieu-of-tax schedules.</p><p><b>Community commitments</b>Request the executed $4M agreement, named recipients, deadlines and disbursement records.</p><p><b>Public oversight</b>The county announced 11 monitoring-committee appointments on October 14, 2026. ${link('committee', 'County announcement')}</p></div><button class="btn" data-view="citizen">Prepare questions for public comment ↗</button></section>
      ${sources(['oracle','hb596fiscal','hb596','sb26fiscal','sb26','irb','committee'])}`;
  }).catch(() => {
    for (const [name, section] of Object.entries(sections)) section.innerHTML = `<h1>${name === 'virginia' ? 'Virginia' : 'New Mexico'} public-cost account</h1><p role="alert">The evidence file could not be loaded. No figures are being shown. Reload to retry.</p><a class="btn" href="state-costs.json">Open the source account</a><button class="btn" data-view="states">Back to states</button>`;
  });
})();
