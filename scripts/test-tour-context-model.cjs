'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const model=require('../site/tour-context-model.js');
const ballot=require('../site/ballot-measures.json');
const measure=(jurisdiction='Boulder City',state='NV',patch={})=>({id:state+'-'+jurisdiction,state,jurisdiction,
  title:'A local vote',summary:'A vote about specified land.',limit:'Verify the covered area.',
  sources:[{kind:'official',label:'City record',url:'https://www.bcnv.org/193/Current-Ballot-Questions'}],...patch});

test('structured places and complete US comma addresses preserve literal city names',()=>{
  assert.deepEqual(model.placeFor({city:'Boulder City',state:'Nevada'}),{city:'Boulder City',state:'NV',confidence:'structured'});
  assert.deepEqual(model.placeFor({address:'123 Main St, Suite 200, Boulder City, NV 89005'}),{city:'Boulder City',state:'NV',confidence:'address'});
  assert.deepEqual(model.placeFor({address:'1 Main St, San Juan, PR 00901, USA'}),{city:'San Juan',state:'PR',confidence:'address'});
  assert.equal(model.placeFor({address:'123 Main Street'}).confidence,'unknown');
  assert.equal(model.placeFor({address:'123 Main St, Indiana County, PA 15701'}).confidence,'unknown');
  assert.equal(model.placeFor({city:'Boulder County',state:'CO'}).confidence,'unknown');
  assert.equal(model.placeFor({address:'12 Main St, Boulder City, NV 89005, Canada'}).confidence,'unknown');
});

test('structured metadata that contradicts a complete address remains unknown',()=>{
  for(const fields of [{city:'Las Vegas',state:'NV'},{city:'Boulder City',state:'CO'},{city:'Las Vegas'},{state:'CO'},
    {city:'Boulder County',state:'NV'},{city:'Boulder City',state:'ZZ'}]){
    assert.equal(model.placeFor({...fields,address:'1 Main St, Boulder City, NV 89005'}).confidence,'unknown');
  }
  assert.equal(model.placeFor({city:'Boulder City',state:'NV',address:'1 Main St, Boulder City, NV 89005'}).confidence,'structured');
});

test('only exact city and state matches surface a local measure, with boundary caveats',()=>{
  const stop={name:'A facility',address:'1 Main St, Boulder City, NV 89005'};
  const result=model.matchMeasures([stop],[measure(),measure('Boulder','CO'),measure('Boulder City','CO')]);
  assert.equal(result.matches.length,1);
  assert.deepEqual(result.matches[0].stops,[stop]);
  assert.match(result.matches[0].matchBasis,/address city match/i);
  assert.match(result.matches[0].caveat,/verify municipal boundar.*coverage/i);
  assert.equal(model.matchMeasures([{city:'Boulder',state:'NV'}],[measure()]).matches.length,0);
  assert.equal(model.matchMeasures([{city:'Las Vegas',state:'NV'}],[measure()]).matches.length,0);
  assert.equal(model.matchMeasures([{city:'Boulder City',state:'CO'}],[measure()]).matches.length,0);
});

test('county, statewide and ambiguous manual addresses do not leak into municipal matches',()=>{
  const stops=[{city:'Fairfax',state:'VA'},{address:'1 Main Street'},{city:'California',state:'CA'}];
  const rows=[measure('Fairfax','VA',{jurisdictionType:'county'}),measure('Fairfax County','VA'),measure('California','CA',{scope:'statewide'})];
  const result=model.matchMeasures(stops,rows);
  assert.equal(result.matches.length,0);
  assert.equal(result.unmatchedPlaces.length,3);
  assert.match(result.unmatchedPlaces[0].reason,/selected|coverage/i);
  assert.match(result.unmatchedPlaces[1].reason,/not established|unknown/i);
  assert.doesNotMatch(result.unmatchedPlaces[0].reason,/zero|no measures exist/i);
});

test('one city measure groups stops without implying facility coverage or duplicating decisions',()=>{
  const stops=[{city:'Boulder City',state:'NV',name:'A'},{address:'2 Main St, Boulder City, NV 89005',name:'B'}];
  const result=model.matchMeasures(stops,[measure(),measure()]);
  assert.equal(result.matches.length,1);
  assert.equal(result.matches[0].stops.length,2);
  assert.match(result.matches[0].caveat,/does not establish.*appl|not.*facility/i);
});

test('local legal-effect and next-step fields retain their limits in portable notes',()=>{
  const stops=[{city:'Boulder City',state:'NV',name:'A'}];
  const row=measure('Boulder City','NV',{legalEffect:'Rejecting the use authorization does not decide every future permit.',
    resultStatus:'Reported outcome; verify certification.',nextStep:'Read the city land-use record.',checked:'2026-11-18'});
  const local=model.matchMeasures(stops,[row]).matches[0].measure;
  assert.equal(local.legalEffect,row.legalEffect);
  assert.equal(local.resultStatus,row.resultStatus);
  assert.equal(local.nextStep,row.nextStep);
  const notes=model.exportText(stops,{measures:[row]},{lens:'decisions'});
  assert.match(notes,/Rejecting the use authorization/);
  assert.match(notes,/Read the city land-use record/);
  assert.match(notes,/checked: 2026-11-18/i);
});

test('national context reconciles counts and stays one qualified story rather than local rules',()=>{
  const result=model.nationalStory(ballot.postElection);
  assert.equal(result.available,true);
  assert.match(result.summary,/46 of 47/);
  assert.match(result.summary,/advisory/i);
  assert.ok(result.summary.split(/\s+/).length<=65);
  assert.match(result.limit,/ban/i);
  assert.match(result.limit,/national.*opinion|national.*poll/i);
  for(const patch of [{favoringLimits:47},{rejectedReview:0},{advisory:48},{totalYear:58},{url:'javascript:alert(1)'}]){
    const bad=model.nationalStory({...ballot.postElection,...patch});
    assert.equal(bad.available,false,JSON.stringify(patch));
    assert.equal(bad.counts,null);
  }
  assert.equal(model.nationalStory(null).available,false);
});

test('three lenses connect public observations with records and follow-up, and remain distinct',()=>{
  for(const lens of ['health','costs','decisions']){
    const prompts=model.promptsFor(lens);
    assert.equal(prompts.length,3);
    assert.ok(prompts.every(p=>typeof p==='string'&&p.endsWith('?')));
  }
  assert.match(model.promptsFor('health').join(' '),/PM₂.₅|fine particles/);
  assert.match(model.promptsFor('costs').join(' '),/actually received|who.*paid/i);
  assert.match(model.promptsFor('decisions').join(' '),/binding.*advisory/i);
  assert.deepEqual(model.promptsFor('invalid'),model.promptsFor('health'));
});

test('unsafe evidence URLs are rejected and exported notes preserve text literally',()=>{
  const stop={name:'<script>ignore()</script>',city:'Boulder City',state:'NV',address:'1 Main St, Boulder City, NV 89005',
    source:'javascript:alert(1)',note:'My observation <img src=x onerror=alert(1)>; do not execute this.'};
  const data={...ballot,measures:[measure('Boulder City','NV',{sources:[{kind:'official',url:'javascript:alert(1)'}]})]};
  assert.equal(model.matchMeasures([stop],data.measures).matches.length,0);
  const exported=model.exportText([stop],data,{lens:'costs',notes:'Keep my exact words <b>test</b>'});
  assert.equal(typeof exported,'string');
  assert.match(exported,/<script>ignore\(\)<\/script>/);
  assert.match(exported,/<img src=x onerror=alert\(1\)>/);
  assert.match(exported,/<b>test<\/b>/);
  assert.doesNotMatch(exported,/javascript:alert/);
  const summary=model.summaryFor([stop],data,{lens:'costs'});
  assert.equal(summary.lens,'costs');
  assert.equal(summary.national.available,true);
  assert.equal(summary.local.matches.length,0);
});
