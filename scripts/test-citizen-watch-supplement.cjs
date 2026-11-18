const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const model=require('../site/citizen-watch-model.js');
const supplement=JSON.parse(fs.readFileSync('site/evidence-watch.json','utf8'));
test('focused evidence supplement adds publications, equipment and negotiation guidance',()=>{
 const feed=model.buildFeed({supplement});
 assert.equal(feed.length,11);
 assert.equal(feed.filter(x=>x.kind==='source').length,9);
 assert.equal(feed.filter(x=>x.kind==='filing').length,2);
 const q=feed.find(x=>x.id==='supplement:publication:qiang2026');
 assert.match(q.evidenceStatus,/Preprint/);assert.equal(q.date,'2026-11-04');assert.equal(q.checked,'2026-11-17');
 assert.deepEqual(q.states,['MS','TN']);assert.deepEqual(q.companies,['xai']);
 const gauld=feed.find(x=>x.id==='supplement:publication:gauld2026');
 assert.deepEqual(gauld.states,[]);assert.deepEqual(gauld.companies,['xai']);
});
test('supplement payment announcements retain pledges, term sheets and phase limits',()=>{
 const feed=model.buildFeed({supplement});const pledge=feed.find(x=>x.id==='supplement:agreement:aws-built');
 assert.equal(pledge.kind,'filing');assert.match(pledge.summary,/\$1B/);assert.match(pledge.evidenceStatus,/pledge/);
 assert.match(pledge.phase,/announced/);assert.deepEqual(pledge.companies,['amazon']);assert.deepEqual(pledge.states,[]);
 const city=feed.find(x=>x.id==='supplement:agreement:stlouis');
 assert.deepEqual(city.states,['MO']);assert.match(city.evidenceStatus,/term sheet/);assert.match(city.limit,/not verified receipts/);
});
test('exact source URLs are deduplicated and supplement identities survive order changes',()=>{
 const existing={id:'original',title:'Original record',year:2026,url:supplement.publications[0].url};
 const feed=model.buildFeed({sources:[existing],supplement});assert.equal(feed.length,11);
 assert.equal(feed.filter(x=>x.url===existing.url).length,1);assert.equal(feed.find(x=>x.url===existing.url).id,'source:original');
 const a=model.buildFeed({supplement}).map(x=>x.id).sort();
 const b=model.buildFeed({supplement:{...supplement,publications:[...supplement.publications].reverse()}}).map(x=>x.id).sort();
 assert.deepEqual(a,b);
});
test('equipment orders remain general and are not converted into operating-site claims',()=>{
 const feed=model.buildFeed({supplement});const order=feed.find(x=>x.id==='supplement:equipment:crusoe-order');
 assert.deepEqual(order.states,[]);assert.match(order.evidenceStatus,/contract/);assert.match(order.limit,/not electricity generated/);
 assert.match(order.phase,/Not applicable/);
});
test('a guidance access-date refresh alone does not imply changed substantive evidence',()=>{
 const before=model.buildFeed({supplement}).find(x=>x.id.startsWith('supplement:guidance:'));
 const after=model.buildFeed({supplement:{...supplement,reviewed:'2026-11-18',negotiationSource:{...supplement.negotiationSource,status:supplement.negotiationSource.status.replace('2026-11-17','2026-11-18')}}}).find(x=>x.id===before.id);
 assert.equal(model.fingerprint(before),model.fingerprint(after));
});
