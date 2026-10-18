const {test}=require('node:test');
const assert=require('node:assert/strict');
const {simulate}=require('../site/follow-dollar-model.js');

test('ten annual tax receipts and one upfront upgrade are kept separate',()=>{
 const r=simulate();
 assert.equal(r.annualTax,7500000);
 assert.equal(r.taxReceipts,75000000);
 assert.equal(r.foregoneTax,25000000);
 assert.equal(r.upgradeOperator,50000000);
 assert.equal(r.upgradeOthers,50000000);
 assert.equal(r.operatorTransfers,125000000);
 assert.equal(r.healthDamage,null);
});
test('all offered agreements conserve tax and upgrade allocations without counting relief as cash',()=>{
 for(const taxReliefPercent of [0,25,50])for(const operatorSharePercent of [0,50,100])for(const monitoring of [false,true]){
  const r=simulate({taxReliefPercent,operatorSharePercent,monitoring});
  assert.equal(r.taxReceipts+r.foregoneTax,100000000);
  assert.equal(r.upgradeOperator+r.upgradeOthers,100000000);
  assert.equal(r.operatorTransfers+r.upgradeOthers,r.taxReceipts+100000000+r.monitoringTotal);
  assert.equal(r.monitoringTotal,monitoring?5000000:0);
  assert.equal(r.healthDamage,null);
  assert.equal(r.climateDamage,null);
 }
});
test('monitoring money changes transfers, never an unsupported health estimate',()=>{
 const a=simulate(),b=simulate({monitoring:true});
 assert.equal(b.operatorTransfers-a.operatorTransfers,5000000);
 assert.equal(b.taxReceipts,a.taxReceipts);
 assert.equal(b.healthDamage,a.healthDamage);
 const c=simulate({operatorSharePercent:100});
 assert.equal(c.upgradeOthers,0);
 assert.equal(c.healthDamage,null);
});
test('invalid or nonfinite assumptions cannot produce misleading receipts',()=>{
 for(const args of [{taxReliefPercent:-25},{taxReliefPercent:NaN},{operatorSharePercent:101},{operatorSharePercent:Infinity},{monitoring:'false'}])assert.throws(()=>simulate(args),RangeError);
});
