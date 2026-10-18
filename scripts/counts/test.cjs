const {test}=require('node:test'),assert=require('node:assert/strict');
const {staticRecords,aggregate,recordCheck}=require('./model.cjs');
const Feed=require('../../site/count-feed-model.js');
const record={id:'one',company:'A',name:'Campus',stateCode:'VA',status:'existing'};
test('extracts literal records and spreads without executing source',()=>{
 const code='const a=[{id:"one",company:"A",name:"Campus",stateCode:"VA",status:"existing",description:run()}],b=[...a,{id:"two",company:"B",name:"New",stateCode:"IN",status:"planned"}];throw Error("never execute")';
 assert.equal(staticRecords(code).length,2);
 assert.throws(()=>staticRecords('const a=[{id:run()}]'));
});
test('deduplicates source layers and reconciles state phases',()=>{
 const r=aggregate([record],[{id:'duplicate',company:'a',name:' campus ',state_code:'VA',status:'existing'},{id:'new',company:'B',name:'Build',state_code:'IN',status:'construction'}]);
 assert.equal(r.total,2);assert.equal(r.operating,1);assert.equal(r.under_construction,1);assert.equal(r.construction_by_state.IN,1);
});
test('reads imported arrays and literal factory defaults without running functions',()=>{
 const code='const make=(id,company,name,stateCode,status="existing")=>({id,company,name,stateCode,status}),all=[...imported,make("two","B","Other","IN")];';
 const rows=staticRecords(code,new Map([['imported',[record]]]));assert.equal(rows.length,2);assert.equal(rows[1].status,'existing');
 assert.throws(()=>staticRecords('const make=()=>fetch("bad"),all=[make()]'));
});
test('rejects unknown statuses and missing layers instead of inventing counts',()=>{
 assert.throws(()=>aggregate([record],[]));
 assert.throws(()=>aggregate([record],[{id:'new',company:'B',name:'X',state_code:'IN',status:'announced'}]));
});
test('a failed source check preserves successful history',()=>{
 const old={snapshots:[{date:'2026-10-07',operating:742}]};const r=recordCheck(old,null,'2026-10-18T00:00:00Z',Error());
 assert.deepEqual(r.snapshots,old.snapshots);assert.equal(r.last_check.result,'failed');
});
test('client uses the newest observation and refuses inconsistent or future counts',()=>{
 const old={date:'2026-10-07',operating:742,under_construction:182,planned:63,source:'User-reported'};
 const current={observed_at:'2026-10-18T00:00:00Z',operating:874,under_construction:239,planned:82,total:1195,series:'directory'};
 assert.equal(Feed.merge([current],[old])[0],current);
 assert.equal(Feed.previous(Feed.merge([current],[old])),undefined);
 assert.equal(Feed.valid({...current,total:1194}),false);
 assert.equal(Feed.valid({...current,planned_by_state:{VA:20}}),false);
 assert.equal(Feed.valid({...current,observed_at:'2099-01-01'}),false);
 assert.equal(Feed.merge([current],[{...current}]).length,1);
});
test('project roster shares count deduplication and never calls planned projects construction',()=>{
 const {projectCatalog}=require('./model.cjs');
 const base=[record,{id:'build',company:'B',name:'Build',stateCode:'IN',status:'construction'}];
 const added=[{id:'dup',company:'b',name:'Build',state_code:'IN',status:'construction'},{id:'plan',company:'C',name:'Future',state_code:'NM',status:'planned'}];
 const c=projectCatalog(base,added,'2026-10-18T00:00:00Z'),counts=aggregate(base,added);
 assert.equal(c.records.length,2);assert.equal(c.counts.construction,counts.under_construction);assert.equal(c.counts.planned,counts.planned);
 assert.equal(c.records.find(r=>r.name==='Future').status,'planned');assert.equal(c.records.some(r=>r.status==='existing'),false);
});
