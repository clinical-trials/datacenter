/* Illustrative four-block energy balance. Not an hourly grid or reliability forecast. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NightShiftModel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const assumptions=Object.freeze({hoursPerSlot:6,essentialMW:10,batchMWh:72,chargeEfficiency:.95,dischargeEfficiency:.95,batteryPowerMW:20});
  const slots=Object.freeze([
    Object.freeze({label:'Morning',time:'06–12',solarMWh:90,gridFactor:.35,pricePerMWh:140}),
    Object.freeze({label:'Afternoon',time:'12–18',solarMWh:270,gridFactor:.25,pricePerMWh:120}),
    Object.freeze({label:'Evening',time:'18–24',solarMWh:0,gridFactor:.6,pricePerMWh:220}),
    Object.freeze({label:'Overnight',time:'00–06',solarMWh:0,gridFactor:.4,pricePerMWh:100})
  ]);
  function simulate({batteryMWh=60,batchSlot=2,weather='clear',grid=true}={}){
    if(!Number.isFinite(batteryMWh)||batteryMWh<0||batteryMWh>240||!Number.isInteger(batchSlot)||batchSlot<0||batchSlot>3||!['clear','cloudy'].includes(weather)||typeof grid!=='boolean')throw new RangeError('Use a 0–240 MWh battery, one of four time blocks, clear/cloudy weather, and a boolean grid setting.');
    const a=assumptions,essential=a.essentialMW*a.hoursPerSlot,limit=a.batteryPowerMW*a.hoursPerSlot;
    let stored=0;
    const rows=slots.map((slot,index)=>{
      const solarMWh=slot.solarMWh*(weather==='clear'?1:.35),batchDemandMWh=index===batchSlot?a.batchMWh:0,demandMWh=essential+batchDemandMWh;
      const storedStartMWh=stored,solarToLoadMWh=Math.min(solarMWh,demandMWh),surplus=solarMWh-solarToLoadMWh;
      const chargeInputMWh=Math.min(surplus,limit,Math.max(0,(batteryMWh-stored)/a.chargeEfficiency));
      stored+=chargeInputMWh*a.chargeEfficiency;
      const batteryDelivered=Math.min(demandMWh-solarToLoadMWh,limit,stored*a.dischargeEfficiency);
      stored=Math.max(0,stored-batteryDelivered/a.dischargeEfficiency);
      const remaining=Math.max(0,demandMWh-solarToLoadMWh-batteryDelivered),gridMWh=grid?remaining:0,unmetMWh=remaining-gridMWh;
      const servedMWh=solarToLoadMWh+batteryDelivered+gridMWh,essentialServedMWh=Math.min(essential,servedMWh),batchServedMWh=Math.min(batchDemandMWh,Math.max(0,servedMWh-essential));
      const lossMWh=chargeInputMWh*(1-a.chargeEfficiency)+batteryDelivered/a.dischargeEfficiency-batteryDelivered;
      return {...slot,solarMWh,demandMWh,servedMWh,solarToLoadMWh,batteryMWh:batteryDelivered,chargeInputMWh,storedStartMWh,storedEndMWh:stored,lossMWh,curtailedMWh:surplus-chargeInputMWh,gridMWh,unmetMWh,essentialServedMWh,batchServedMWh,gridCO2eTonnes:gridMWh*slot.gridFactor,gridCost:gridMWh*slot.pricePerMWh};
    });
    const sum=field=>rows.reduce((n,row)=>n+row[field],0);
    return {slots:rows,demandMWh:sum('demandMWh'),solarMWh:sum('solarMWh'),solarToLoadMWh:sum('solarToLoadMWh'),gridMWh:sum('gridMWh'),batteryChargeInputMWh:sum('chargeInputMWh'),batteryDeliveredMWh:sum('batteryMWh'),storageLossMWh:sum('lossMWh'),curtailedMWh:sum('curtailedMWh'),endingStoredMWh:stored,essentialServedMWh:sum('essentialServedMWh'),essentialDemandMWh:essential*slots.length,batchServedMWh:sum('batchServedMWh'),batchDemandMWh:a.batchMWh,unmetMWh:sum('unmetMWh'),gridCO2eTonnes:sum('gridCO2eTonnes'),gridCost:sum('gridCost'),allDemandServed:sum('unmetMWh')<1e-8};
  }
  return {simulate,assumptions,slots};
});
