'use strict';
(() => {
 const get = id => document.getElementById(id);
 const n = (value, places=1) => Number(value).toLocaleString('en-US',{maximumFractionDigits:places});
 const amount = value => n(value,value<1?3:1);
 const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const source = id => {const s=DATA.sources.find(s=>s.id===id);return s?`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} [${s.number}]</a>`:'';};
 const stateRows=DATA.states.filter(s=>s.abbreviation!=='US').sort((a,b)=>a.name.localeCompare(b.name));
 const stateName=code=>code==='US'?'United States':stateRows.find(s=>s.abbreviation===code)?.name||code;
 const electricity=(state,year,scenario='medium')=>DATA.series.find(r=>r.state===state&&r.year===year&&r.scenario===scenario)?.annual_TWh;
 let chosenState='US',chosenYear=2024;
 for(const [value,label] of [['US','United States'],...stateRows.map(s=>[s.abbreviation,s.name])]) {const o=document.createElement('option');o.value=value;o.textContent=label;get('impact-state').append(o);}
 function chooseTab(name){document.querySelectorAll('[data-impact-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.impactTab===name)));for(const key of ['electricity','water','carbon','local'])get('impact-'+key).hidden=key!==name;}
 document.querySelectorAll('[data-impact-tab]').forEach(b=>b.addEventListener('click',()=>chooseTab(b.dataset.impactTab)));
 const tileColors=value=>value<=1?['#eaf0f3','#233e50']:value<=5?['#b8d4df','#183748']:value<=15?['#5d9aad','#102e40']:['#175269','#fff'];
 function renderElectricity(){
  const year=chosenYear;
  get('impact-state-tiles').innerHTML=stateRows.map(s=>{const value=electricity(s.abbreviation,year),[bg,ink]=tileColors(value);return `<button class="state-tile" data-impact-state="${s.abbreviation}" aria-pressed="${s.abbreviation===chosenState}" style="--tile:${bg};--tile-ink:${ink}" aria-label="${esc(s.name)}: ${amount(value)} TWh, ${year} ${year===2024?'estimate':'medium scenario'}"><b>${s.abbreviation}</b><small>${amount(value)}</small></button>`;}).join('');
  const v=electricity(chosenState,year),base=electricity(chosenState,2024),future=electricity(chosenState,2030),low=electricity(chosenState,2030,'low'),high=electricity(chosenState,2030,'high');
  const lo0=electricity(chosenState,2024,'low'),hi0=electricity(chosenState,2024,'high');
  get('impact-energy-kpi').innerHTML=`${amount(v)} <small>TWh</small>`;get('impact-energy-scope').textContent=`${chosenState==='US'?'U.S.':stateName(chosenState)} · ${year} ${year===2024?'model estimate':'medium scenario'}`;
  const max=Math.max(high,hi0,.001)*1.06,scale=v=>v/max*305;
  const svgRow=(y,title,value,low,high,color)=>`<text x="0" y="${y}">${title}</text><text class="chart-number" x="0" y="${y+23}">${amount(value)} TWh</text><rect x="0" y="${y+34}" width="${scale(value)}" height="22" fill="${color}"/><line x1="${scale(low)}" x2="${scale(high)}" y1="${y+45}" y2="${y+45}" stroke="#182f41" stroke-width="2"/><path d="M${scale(low)} ${y+39}v12 M${scale(high)} ${y+39}v12" stroke="#182f41" stroke-width="2"/><text x="0" y="${y+76}">Range: ${amount(low)}–${amount(high)} TWh</text>`;
  const ratio=base>0?`${n(future/base,1)}× the 2024 estimate`:'Percentage growth is undefined from a zero baseline';
  get('impact-energy-chart').innerHTML=`<h3>${esc(stateName(chosenState))}</h3><p class="impact-note">Annual electricity · TWh/year</p><svg class="range-chart" viewBox="0 0 325 214" role="img" aria-label="${esc(stateName(chosenState))}: 2024 estimate ${base} TWh, source range ${lo0} to ${hi0}; 2030 medium scenario ${future} TWh, low to high scenarios ${low} to ${high}.">${svgRow(15,'2024 · historical estimate',base,lo0,hi0,'#536e80')}${svgRow(113,'2030 · medium scenario',future,low,high,'#d59c28')}</svg><p class="impact-insight"><b>${esc(ratio)}.</b> More electricity demand increases the scale of power infrastructure required; its emissions depend on how and when that power is supplied.</p>`;
  get('impact-energy-source').innerHTML=`Source: ${source('EPRI2026')}. Bars begin at zero and share a scale within the selected geography. The line over each bar spans its source range; chart scales change when you select another state.`;
 }
 get('impact-state').addEventListener('change',e=>{chosenState=e.target.value;renderElectricity();});get('impact-year').addEventListener('change',e=>{chosenYear=Number(e.target.value);renderElectricity();});
 get('impact-state-tiles').addEventListener('click',e=>{const b=e.target.closest('[data-impact-state]');if(b){chosenState=b.dataset.impactState;get('impact-state').value=chosenState;renderElectricity();}});
 const water=DATA.water.slice().sort((a,b)=>b.consumptionMG-a.consumptionMG);let campus=water.find(w=>w.location==='Council Bluffs')||water[0];
 for(const w of water.slice().sort((a,b)=>a.location.localeCompare(b.location))){const o=document.createElement('option');o.value=w.location;o.textContent=`${w.location}, ${w.abbreviation}`;get('impact-campus').append(o);}get('impact-campus').value=campus.location;
 function renderWaterImpact(){
  const w=campus,total=w.consumptionMG+w.dischargeMG,fraction=total>0?w.consumptionMG/total:0;
  const balanced=Math.abs(total-w.withdrawalMG)<=1e-8;
  get('impact-water-kpi').innerHTML=`${amount(w.consumptionMG)} <small>M gal</small>`;get('impact-water-scope').textContent=`${w.location} · reported 2024`;
  get('impact-water-flow').innerHTML=`<div><h3>${esc(w.location)}, ${esc(w.name)}</h3><p class="impact-note">Google location · million U.S. gallons in 2024</p></div><div class="water-numbers"><div><strong>${amount(w.withdrawalMG)}</strong><span>withdrawn</span></div><div><strong>${amount(w.dischargeMG)}</strong><span>discharged</span></div><div><strong style="color:#08796b">${amount(w.consumptionMG)}</strong><span>consumed</span></div></div><div><div class="water-stacked" role="img" aria-label="Reported water components: ${w.consumptionMG} million gallons consumed and ${w.dischargeMG} million gallons discharged; segment widths scaled to their reported sum."><span class="water-consumed" style="width:${fraction*100}%"></span><span class="water-discharged" style="width:${(1-fraction)*100}%"></span></div><div class="impact-key"><span><i style="--key:#08796b"></i>Consumed</span><span><i style="--key:#8cd5c8"></i>Discharged</span></div></div><p class="impact-insight">${balanced&&w.withdrawalMG>0?`<b>${n(w.consumptionMG/w.withdrawalMG*100)}%</b> of reported withdrawal was consumed within this accounting boundary.`:'<b>Rounded values do not exactly balance.</b> Segments show the reported consumption and discharge, scaled to their sum.'} Local water stress also depends on the source and the season.</p>`;
  const top=water.slice(0,6);if(!top.includes(w))top.push(w);
  get('impact-water-bars').innerHTML=top.map(r=>`<button class="water-row" data-impact-campus="${esc(r.location)}" aria-pressed="${r===w}" aria-label="${esc(r.location)}, ${r.consumptionMG} million gallons consumed"><span>${esc(r.location)}<br><small>${r.abbreviation}</small></span><span class="water-track"><i style="width:${r.consumptionMG/water[0].consumptionMG*100}%"></i></span><strong>${amount(r.consumptionMG)}</strong></button>`).join('');
  get('impact-water-source').innerHTML=`Source: ${source('GOOGLE2025')}, report pp. 110–114. The bar compares reported consumption plus discharge; withdrawal is shown separately. Read the source’s measurement, estimation and limited-assurance scope before comparing facilities.`;
 }
 get('impact-campus').addEventListener('change',e=>{campus=water.find(w=>w.location===e.target.value);renderWaterImpact();});get('impact-water-bars').addEventListener('click',e=>{const b=e.target.closest('[data-impact-campus]');if(b){campus=water.find(w=>w.location===b.dataset.impactCampus);get('impact-campus').value=campus.location;renderWaterImpact();}});
 let pue1=1.15,wue1=.2,carbonInputs;
 function mini(title,unit,base,next,parts){const max=Math.max(base,next,.001),delta=base>0?(next/base-1)*100:null;const change=delta===null?'':`${delta>0?'+':''}${n(delta)}%`;return `<div class="mini-comparison"><header><b>${title}</b><span class="${delta>0?'change-up':'change-down'}">${change}</span></header><div class="mini-row"><span>Baseline</span><span class="mini-track"><i style="width:${base/max*100}%"></i></span><strong>${amount(base)}</strong></div><div class="mini-row"><span>Scenario</span><span class="mini-track">${parts?`<i class="scenario-fill" style="width:${parts[0]/max*100}%"></i><i class="embodied-fill" style="width:${parts[1]/max*100}%"></i>`:`<i class="scenario-fill" style="width:${next/max*100}%"></i>`}</span><strong>${amount(next)}</strong></div><p class="impact-note">${unit}</p></div>`;}
 function renderCarbon(){
  const x={base:10,growth:Number(get('iv-growth').value),saving:Number(get('iv-saving').value),ci0:.4,ci1:Number(get('iv-ci').value)/1000,pue0:1.3,pue1,wue0:.5,wue1,embodied:Number(get('iv-embodied').value)};
  carbonInputs=x;
  const r=calculateScenario(x),delta=(r.total/r.c0-1)*100;
  get('iv-growth-value').textContent=n(x.growth)+'×';get('iv-saving-value').textContent=n(x.saving,0)+'%';get('iv-ci-value').textContent=n(x.ci1*1000,0)+' g CO₂e/kWh';get('iv-embodied-value').textContent=n(x.embodied,0)+' t CO₂e';
  get('impact-carbon-kpi').textContent=(delta>0?'+':'')+n(delta,0)+'%';
  get('impact-fixed-assumptions').textContent=`Scenario PUE ${n(pue1,2)} · water intensity ${n(wue1,2)} L/kWh IT. Baseline: 10 GWh IT, PUE 1.30, 400 g CO₂e/kWh and 0.50 L/kWh IT.`;
  get('impact-carbon-results').innerHTML=`<h3>${r.total<=r.c0?'Within the included carbon baseline':'Above the included carbon baseline'}</h3><p class="impact-note">${n(x.growth)}× useful work under the selected assumptions</p>${mini('Electricity','GWh/year · whole facility',r.e0/1e6,r.e1/1e6)}${mini('Direct water consumption','Million liters/year · excludes electricity-generation water',r.w0,r.w1)}${mini('Included emissions','Tonnes CO₂e/year · electricity + added embodied allowance',r.c0,r.total,[r.c1,x.embodied])}<div class="impact-key"><span><i style="--key:#c0783f"></i>Scenario electricity emissions</span><span><i style="--key:#e9c28b"></i>Additional embodied allowance</span></div><p class="impact-insight">${r.e1>r.e0&&r.total<r.c0?'Electricity can rise while carbon falls. Cleaner supply changes emissions; it does not remove the demand for power.':r.total>r.c0?'Growth can outweigh efficiency. Reduce unnecessary work and check absolute totals, not only energy per task.':'A lower modeled footprint requires these efficiency, water and electricity assumptions to hold in practice.'}</p>`;
 }
 for(const id of ['iv-growth','iv-saving','iv-ci','iv-embodied'])get(id).addEventListener('input',renderCarbon);
 get('impact-full-scenario').addEventListener('click',()=>{for(const [key,value] of Object.entries(carbonInputs))get('s-'+key).value=value;renderScenario();});
 document.querySelectorAll('[data-carbon-preset]').forEach(b=>b.addEventListener('click',()=>{const efficient=b.dataset.carbonPreset==='efficient';pue1=efficient?1.15:1.3;wue1=efficient?.2:.5;get('iv-growth').value=2;get('iv-saving').value=efficient?40:0;get('iv-ci').value=efficient?100:400;get('iv-embodied').value=efficient?500:0;renderCarbon();}));
 get('impact-carbon-source').innerHTML=`Research behind the accounting boundaries: ${source('L04')}; ${source('L09')}; ${source('L19')}. These sources motivate the framework; they do not validate the slider defaults.`;
 get('impact-engine-grid').innerHTML=Array.from({length:84},()=>'<i aria-hidden="true"></i>').join('');
 const updateCoverage=x=>{if(x)get('impact-ledger-coverage').innerHTML=`<b>${Number(x.count)} records / ${Number(x.states)} states</b> · ${x.online?'project ledger':'offline baseline'}`;};
 window.addEventListener('footprint-ledger-coverage',e=>updateCoverage(e.detail));updateCoverage(window.footprintLedgerCoverage);
 renderElectricity();renderWaterImpact();renderCarbon();
})();
