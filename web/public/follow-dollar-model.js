/* Fictional agreement, undiscounted USD. Transfers are not net social benefits. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FollowDollarModel=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const assumptions=Object.freeze({years:10,annualTaxBeforeRelief:10000000,upfrontUpgrade:100000000,annualMonitoring:500000});
  function simulate({taxReliefPercent=25,operatorSharePercent=50,monitoring=false}={}){
    if(![0,25,50].includes(taxReliefPercent)||![0,50,100].includes(operatorSharePercent)||typeof monitoring!=='boolean')throw new RangeError('Choose an offered tax reduction, upgrade allocation, and boolean monitoring setting.');
    const a=assumptions,annualTax=a.annualTaxBeforeRelief*(1-taxReliefPercent/100),taxReceipts=annualTax*a.years;
    const foregoneTax=a.annualTaxBeforeRelief*a.years-taxReceipts,upgradeOperator=a.upfrontUpgrade*operatorSharePercent/100,upgradeOthers=a.upfrontUpgrade-upgradeOperator;
    const monitoringAnnual=monitoring?a.annualMonitoring:0,monitoringTotal=monitoringAnnual*a.years;
    return {annualTax,taxReceipts,foregoneTax,upgradeOperator,upgradeOthers,monitoringAnnual,monitoringTotal,operatorTransfers:taxReceipts+upgradeOperator+monitoringTotal,healthDamage:null,climateDamage:null};
  }
  return {simulate,assumptions};
});
