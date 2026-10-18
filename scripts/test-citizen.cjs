const {test}=require('node:test');
const assert=require('node:assert/strict');
const m=require('../site/citizen-model.js');
test('mixed concerns produce separate letters to the responsible offices',()=>{
 const letters=m.build({topicIds:['startup','noise','contracts','health','grid','climate'],scope:'jasper',position:'questions'});
 assert.deepEqual(letters.map(x=>x.route),['air','planning','county','health','utility','policy']);
 assert.match(letters[0].text,/PJackso@idem.IN.gov/);
 assert.doesNotMatch(letters[1].text,/PJackso|0\.279/);
 assert.match(letters[4].text,/cause number/);
 assert.match(letters[5].text,/\[Your Indiana state senator or representative\]/);
});
test('other communities never inherit Indiana facts, recipients or deadlines',()=>{
 const letters=m.build({scope:'other',project:'Mesa project',place:'New Mexico',topicIds:m.topics.map(t=>t.id),position:'questions'});
 for(const l of letters){assert.doesNotMatch(l.text,/50413|Jasper|PJackso|384|572|November 16/);assert.match(l.text,/Mesa project/);}
});
test('deadline status uses Indiana calendar date, never assumes a closing hour',()=>{
 assert.equal(m.deadlineStatus('2026-11-15'),'upcoming');
 assert.equal(m.deadlineStatus('2026-11-16'),'today');
 assert.equal(m.deadlineStatus('2026-11-17'),'past');
 assert.equal(m.case.deadline,'2026-11-16');
 assert.equal(m.case.deadlineTime,null);
});
test('record requests ask for existing records, not automatically new studies',()=>{
 const l=m.build({scope:'jasper',kind:'records',topicIds:['baseline'],position:'oppose'})[0];
 assert.match(l.text,/existing records/);assert.doesNotMatch(l.text,/I oppose|Please evaluate/);
});
test('drafts preserve personal words literally and cannot invent support',()=>{
 const note='<img onerror=alert(1)> & My observation.';
 const l=m.build({scope:'jasper',topicIds:['emergency'],position:'questions',note})[0];
 assert.ok(l.text.includes(note));assert.match(l.text,/annual caps/);assert.doesNotMatch(l.text,/unlimited emissions|I support/);
 assert.equal(m.build({scope:'jasper',topicIds:['unknown']}).length,0);
 assert.equal(m.build({scope:'jasper',topicIds:['noise','noise']}).length,1);
});
