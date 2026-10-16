const {test}=require('node:test');const assert=require('node:assert/strict');
const {findTour,readMatrix,nearbyCandidates}=require('../site/tour-suggestion-model.js');
const candidates=[0,1,2].map((n)=>({name:'Stop '+n,address:n+' Main St',location:{coordinates:[-106+n*.001,35],source:'https://example.org'},distance:n}));
test('pause time is counted at every stop and a budget cannot be rounded into a fit',()=>{
 const matrix=[[0,60.1,600],[60.1,0,600],[600,600,0]];
 assert.equal(findTour(candidates,matrix,{budget:5,dwell:2}),null);
 const r=findTour(candidates,matrix,{budget:10,dwell:2});assert.deepEqual(r.indices,[0,1]);assert.equal(r.total,300.1);
 assert.equal(findTour(candidates,matrix,{budget:5,dwell:3}),null);
});
test('finds a better stop order and counts a return leg when requested',()=>{
 const m=[[0,600,50],[70,0,30],[50,30,0]];
 const r=findTour(candidates,m,{budget:8,dwell:2});assert.deepEqual(r.indices,[0,2,1]);assert.equal(r.total,440);
 const loop=findTour(candidates,m,{budget:8,dwell:2,roundTrip:true});assert.equal(loop.indices.length,2);assert.equal(loop.travel,100);
});
test('unreachable matrix pairs stay unknown; no straight-line fallback',()=>{
 const p={location:[-106,35],distance:3};const d={code:'Ok',durations:[[0,null],[null,0]],sources:[p,p],destinations:[p,p]};
 const m=readMatrix(d,2);assert.equal(findTour(candidates.slice(0,2),m,{budget:20,dwell:1}),null);
 assert.throws(()=>readMatrix({...d,durations:[[0]]},2));
 const far={...p,distance:200};assert.deepEqual(readMatrix({...d,durations:[[0,50],[50,0]],sources:[p,far]},2),[[0,null],[null,null]]);
});
test('candidate selection respects radius, removes colocated/duplicate sites and caps workload',()=>{
 const c=[...candidates,{...candidates[0],name:'Same building'}];
 assert.equal(nearbyCandidates(c,[-106,35],10,8).length,3);
 assert.equal(nearbyCandidates(c,[0,0],10,8).length,0);
 assert.equal(nearbyCandidates(c,[-106,35],10,2).length,2);
});
test('an address alias cannot create two stops at the same building; reviewed source wins',()=>{
 const a={...candidates[0],address:'505 Marquette Ave NW, Albuquerque, NM 87102',priority:0};
 const b={...candidates[1],address:'505 Marquette Avenue Northwest, Albuquerque, NM 87102'};
 const result=nearbyCandidates([b,a],[-106,35],10);
 assert.equal(result.length,1);assert.equal(result[0].address,a.address);
});
