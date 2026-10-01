import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const model = vm.runInNewContext(fs.readFileSync(new URL('public/scale-model.js', root), 'utf8') + '\nFootprintScale');
const data = JSON.parse(fs.readFileSync(new URL('public/household-electricity-2024.json', root)));
test('capacity and annual-total modes agree, with no extra PUE multiplier', () => {
  const r = model.calculate({mode:'capacity',capacityMW:100,averagePercent:80,year:2026,monthlyKWh:817});
  assert.equal(r.annualMWh,700800); assert.equal(Math.round(r.customerEquivalents),71481);
  assert.equal(model.calculate({mode:'annual',annualMWh:700800,monthlyKWh:817}).customerEquivalents,r.customerEquivalents);
});
test('calendar hours include leap years but not century 2100; zeros are valid', () => {
  for (const [year,hours] of [[2024,8784],[2026,8760],[2100,8760]]) assert.equal(model.calculate({mode:'capacity',capacityMW:1,averagePercent:100,year,monthlyKWh:901}).annualMWh,hours);
  assert.equal(model.calculate({mode:'annual',annualMWh:0,monthlyKWh:901}).customerEquivalents,0);
});
test('missing, nonfinite, negative and out-of-bound inputs cannot produce plausible results', () => {
  for(const annualMWh of [NaN,Infinity,-1,undefined,'100']) assert.throws(()=>model.calculate({mode:'annual',annualMWh,monthlyKWh:901}));
  for(const averagePercent of [-1,101,NaN]) assert.throws(()=>model.calculate({mode:'capacity',capacityMW:100,averagePercent,year:2026,monthlyKWh:901}));
  assert.throws(()=>model.calculate({mode:'annual',annualMWh:1,monthlyKWh:0}));
});
test('50 states, DC and national denominator; independently checked key values', () => {
  assert.equal(data.rows.length,52); assert.equal(new Set(data.rows.map(r=>r.state)).size,52);
  for(const [state,kwh] of [['IN',901],['PA',817],['CA',503],['US',863]]) assert.equal(data.rows.find(r=>r.state===state).monthlyKWh,kwh);
  assert.ok(data.rows.every(r=>r.year===2024&&r.monthlyKWh>0));
});
