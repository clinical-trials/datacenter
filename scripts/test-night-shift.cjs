const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const available=fs.existsSync('site/night-shift-model.js');
const model=available?require('../site/night-shift-model.js'):null;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} differs from ${b}`);
test('Night Shift supplies a working simulation',()=>assert.ok(model?.simulate));
if(model){
  test('moving the same batch to daylight reduces grid purchases without discarding work',()=>{
    const night=model.simulate({batteryMWh:0,batchSlot:2,weather:'clear',grid:true});
    const day=model.simulate({batteryMWh:0,batchSlot:1,weather:'clear',grid:true});
    near(night.demandMWh,312);near(day.demandMWh,312);
    near(night.gridMWh,192);near(day.gridMWh,120);
    near(night.gridCO2eTonnes,103.2);near(day.gridCO2eTonnes,60);
    near(night.gridCost,35040);near(day.gridCost,19200);
    near(day.batchServedMWh,72);near(day.essentialServedMWh,240);
  });
  test('stored solar is charged first, obeys power limits, and includes losses',()=>{
    const r=model.simulate({batteryMWh:240,batchSlot:1,weather:'clear',grid:false});
    near(r.gridMWh,0);near(r.unmetMWh,0);near(r.batteryChargeInputMWh,150);
    near(r.batteryDeliveredMWh,120);near(r.storageLossMWh,13.81578947368422);
    near(r.endingStoredMWh,16.18421052631578);near(r.curtailedMWh,18);
    assert.equal(r.slots[0].storedStartMWh,0);
    for(const s of r.slots){
      assert.ok(s.batteryMWh<=120+1e-8);assert.ok(s.chargeInputMWh<=120+1e-8);
      assert.ok(s.storedEndMWh>=-1e-8&&s.storedEndMWh<=240+1e-8);
    }
  });
  test('no grid and no battery leaves nighttime demand visibly unmet',()=>{
    const r=model.simulate({batteryMWh:0,batchSlot:2,weather:'clear',grid:false});
    near(r.essentialServedMWh,120);near(r.batchServedMWh,0);near(r.unmetMWh,192);
    near(r.gridCO2eTonnes,0);assert.equal(r.allDemandServed,false);
  });
  test('cloudy daytime scheduling cannot invent surplus for an empty battery',()=>{
    const r=model.simulate({batteryMWh:240,batchSlot:1,weather:'cloudy',grid:false});
    near(r.solarMWh,126);near(r.batteryDeliveredMWh,0);near(r.unmetMWh,186);
    assert.equal(r.allDemandServed,false);
  });
  test('all supported settings conserve energy including storage changes and curtailment',()=>{
    for(const weather of ['clear','cloudy'])for(const grid of [true,false])for(const batteryMWh of [0,30,60,120,240])for(const batchSlot of [0,1,2,3]){
      const r=model.simulate({batteryMWh,batchSlot,weather,grid});
      for(const s of r.slots){
        near(s.solarToLoadMWh+s.batteryMWh+s.gridMWh+s.unmetMWh,s.demandMWh);
        near(s.solarMWh+s.gridMWh+s.storedStartMWh,s.servedMWh+s.curtailedMWh+s.lossMWh+s.storedEndMWh);
      }
      near(r.demandMWh,r.essentialServedMWh+r.batchServedMWh+r.unmetMWh);
      near(r.solarMWh+r.gridMWh,r.essentialServedMWh+r.batchServedMWh+r.curtailedMWh+r.storageLossMWh+r.endingStoredMWh);
    }
  });
  test('invalid capacities and schedules are rejected instead of producing plausible numbers',()=>{
    for(const args of [{batteryMWh:-1},{batteryMWh:NaN},{batchSlot:4},{weather:'invented'}])assert.throws(()=>model.simulate(args),RangeError);
  });
}
