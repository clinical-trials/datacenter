'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../site/ballot-model.js');
const base={asOf:'2026-11-14',checked:'2026-11-18',electionDate:'2026-11-03',total:47,favoringLimits:46,approvedLimiting:33,rejectedSupportive:13,rejectedReview:1,totalYear:57,decidedYear:53,favoringLimitsYear:52,pendingYear:4,advisory:10,byState:{OH:21,ME:9,IL:7,KS:4,WI:3,AR:2,CA:2,NH:2,NJ:2,ND:2,FL:1,MI:1,NV:1},url:'https://ballotpedia.org/Data_center-related_ballot_measures,_2026'};
test('post-election denominators remain distinct and reconcile with their classifications',()=>{
 const r=model.electionSummary(base);assert.ok(r);assert.equal(r.total,47);assert.equal(r.totalYear,57);assert.equal(r.decidedYear,53);assert.equal(r.advisory,10);
 for(const edit of [{favoringLimits:47},{rejectedReview:0},{pendingYear:3},{advisory:48},{byState:{OH:20}},{total:NaN}])assert.equal(model.electionSummary({...base,...edit}),null);
});
test('invalid or unsafe aggregate records cannot become headline findings',()=>{
 assert.equal(model.electionSummary(null),null);assert.equal(model.electionSummary({...base,url:'javascript:alert(1)'}),null);assert.equal(model.electionSummary({...base,url:'https://user:pass@example.org/'}),null);assert.equal(model.electionSummary({...base,checked:'not a date'}),null);
});
