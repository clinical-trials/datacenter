'use strict';
(() => {
  const form = document.getElementById('scale-form');
  if (!form) return;
  const el = id => document.getElementById(id);
  const format = (v, digits = 0) => v.toLocaleString('en-US', {maximumFractionDigits: digits});
  const rows = RESIDENTIAL_ELECTRICITY_2024.rows;
  for (const row of rows) {
    const option = document.createElement('option');
    option.value = row.state; option.textContent = row.name;
    el('scale-state').append(option);
  }
  el('scale-state').value = 'IN';
  function render() {
    const mode = el('scale-mode').value;
    for (const [id, enabled] of [['scale-capacity-fields', mode === 'capacity'], ['scale-annual-fields', mode === 'annual']]) {
      el(id).hidden = !enabled;
      for (const input of el(id).querySelectorAll('input')) input.disabled = !enabled;
    }
    const out = el('scale-result');
    if (!form.checkValidity()) {
      out.textContent = 'Complete the active fields with valid values to calculate the comparison.';
      return;
    }
    const row = rows.find(r => r.state === el('scale-state').value);
    try {
      const r = FootprintScale.calculate({mode, capacityMW: el('scale-mw').valueAsNumber, averagePercent: el('scale-average').valueAsNumber, year: el('scale-year').valueAsNumber, annualMWh: el('scale-mwh').valueAsNumber, monthlyKWh: row.monthlyKWh});
      out.replaceChildren();
      const label = document.createElement('p'); label.className = 'eyebrow';
      label.textContent = mode === 'capacity' ? 'Illustrative capacity scenario' : 'Entered annual total · not independently verified';
      const energy = document.createElement('p'); energy.className = 'scale-number';
      energy.textContent = `${format(r.annualMWh / 1000, 2)} GWh / year`;
      const equivalent = document.createElement('p'); equivalent.className = 'scale-equivalent';
      equivalent.textContent = `About ${format(r.customerEquivalents)} residential customers’ annual electricity purchases in ${row.name}.`;
      const formula = document.createElement('p'); formula.className = 'formula';
      formula.textContent = mode === 'capacity' ? `${el('scale-mw').value} MW × ${el('scale-average').value}% × ${format(r.hours)} hours (${el('scale-year').value}) = ${format(r.annualMWh, 2)} MWh` : `${format(r.annualMWh, 2)} MWh entered for: ${el('scale-period').value.trim()}`;
      const denominator = document.createElement('p'); denominator.className = 'small';
      denominator.textContent = `Comparison: ${format(r.annualMWh, 2)} MWh × 1,000 ÷ (${format(row.monthlyKWh)} kWh/month × 12). The denominator is EIA’s rounded 2024 average per residential customer in ${row.name}; it stays at 2024 when the facility calculation year changes.`;
      out.append(label, energy, equivalent, formula, denominator);
    } catch (error) { out.textContent = error.message; }
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  render();
})();
