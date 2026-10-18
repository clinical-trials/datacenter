const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('../work/citizen-test/node_modules/jsdom');

const stops=[
  {name:'DRT LAX10',address:'600 West 7th Street, Los Angeles, CA 90017',coordinates:[-118.257514,34.047326]},
  {name:'One Wilshire',address:'624 South Grand Avenue, Los Angeles, CA 90017',coordinates:[-118.255546,34.047892]}
];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function flush(){for(let i=0;i<8;i++)await tick();}
function setup({drivingWait,walkingWait,walkingError=false}={}){
  const dom=new JSDOM('<div id="finder"></div>',{url:'https://example.test/#tours',runScripts:'outside-only'}),w=dom.window,d=w.document;
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.AbortController=AbortController;
  w.fetch=async url=>{
    if(String(url).includes('zippopotam.us'))return {ok:true,json:async()=>({places:[{'place name':'Beverly Hills','state abbreviation':'CA',longitude:'-118.4065',latitude:'34.103'}]})};
    const fixtures={
      'nearby-locations.geojson':{features:[]},
      'community-tour-stops.json':{stops:stops.map(s=>({...s,verification:'Operator facility listing',phase:'Existing listing'}))},
      'tour-geocodes.json':{locations:stops.map(s=>({...s,source:'https://example.test/address'}))},
      'nearby-addresses.json?v=20261012':{records:[],retrieved:'2026-10-12'}
    };
    assert.ok(fixtures[String(url)],'Unexpected network dependency: '+url);
    return {ok:true,json:async()=>fixtures[String(url)]};
  };
  for(const file of ['tour-routing-model.js','tour-suggestion-model.js','facility-addresses.js'])w.eval(fs.readFileSync('site/'+file,'utf8'));
  w.TourRoutingService={
    matrix:async(_points,mode)=>{if(mode==='walking'&&walkingError)throw Error('Walking service unavailable');if(mode==='walking'&&walkingWait)await walkingWait;if(mode==='driving'&&drivingWait)await drivingWait;return [[0,mode==='walking'?219:91],[mode==='walking'?219:91,0]];},
    route:async(points,mode)=>({duration:mode==='walking'?219:91,distance:350,legs:[{duration:mode==='walking'?219:91,distance:350}],geometry:{type:'LineString',coordinates:points.map(p=>p.coordinates)}})
  };
  w.eval(fs.readFileSync('site/tour-suggestions.js','utf8'));
  let used=null;
  w.TourSuggestions.create({mount:d.querySelector('#finder'),onUse:async suggestion=>{used=suggestion;}});
  function submit(){d.querySelector('#ct-auto-zip').value='90210';return d.querySelector('#ct-auto-form').onsubmit(new w.Event('submit',{cancelable:true}));}
  return {dom,w,d,submit,used:()=>used};
}

test('a usable walking tour appears before a slow driving lookup finishes',async()=>{
  let finishDriving;const wait=new Promise(resolve=>{finishDriving=resolve;});
  const x=setup({drivingWait:wait}),job=x.submit();
  try{
    await flush();
    assert.equal(x.d.querySelectorAll('#ct-auto-results > .ct-auto-card:not(.ct-auto-unavailable)').length,1,'Walking result must not wait for driving');
    assert.match(x.d.querySelector('#ct-auto-result-heading').textContent,/1 tour/);
    assert.equal(x.d.querySelector('#ct-auto-submit').disabled,true);
  }finally{finishDriving();await job;x.dom.window.close();}
});

test('90210-style results show fitting tours first and keep the failed five-minute budget collapsed',async()=>{
  const x=setup();
  try{
    await x.submit();
    const cards=x.d.querySelectorAll('#ct-auto-results > .ct-auto-card');
    assert.equal(cards.length,2,'Only usable tours belong in the primary result grid');
    assert.match(cards[0].textContent,/10 min walk/i);
    assert.match(cards[1].textContent,/20 min drive/i);
    const other=x.d.querySelector('#ct-auto-unavailable');
    assert.equal(other.hidden,false);assert.equal(other.open,false);
    assert.match(other.textContent,/5 min walk/i);
    assert.match(x.d.querySelector('#ct-auto-result-heading').textContent,/2 tours.*90210/);
    cards[0].querySelector('button').click();await flush();
    assert.equal(x.used().mode,'walking');assert.equal(x.used().stops.length,2);assert.equal(x.used().budget,10);
  }finally{x.dom.window.close();}
});

test('a walking-service failure does not hide a usable driving route or invent walking time',async()=>{
  const x=setup({walkingError:true});
  try{
    await x.submit();
    assert.equal(x.d.querySelectorAll('#ct-auto-results > .ct-auto-card').length,1);
    assert.match(x.d.querySelector('#ct-auto-results').textContent,/20 min drive/i);
    assert.match(x.d.querySelector('#ct-auto-unavailable').textContent,/Travel time is unknown/);
    assert.match(x.d.querySelector('#ct-auto-result-heading').textContent,/1 tour/);
  }finally{x.dom.window.close();}
});

test('editing the ZIP clears progressive results and late responses cannot restore the old tour',async()=>{
  let finishDriving;const wait=new Promise(resolve=>{finishDriving=resolve;});
  const x=setup({drivingWait:wait}),job=x.submit();
  try{
    await flush();
    x.d.querySelector('#ct-auto-zip').value='10001';x.d.querySelector('#ct-auto-zip').dispatchEvent(new x.w.Event('input'));
    finishDriving();await job;
    assert.equal(x.d.querySelector('#ct-auto-results').childElementCount,0);
    assert.equal(x.d.querySelector('#ct-auto-result-heading').hidden,true);
    assert.equal(x.d.querySelector('#ct-auto-unavailable').hidden,true);
    assert.equal(x.d.querySelector('#ct-auto-submit').disabled,false);
  }finally{finishDriving();await job;x.dom.window.close();}
});

test('when every budget is too short, the reasons are visible without inventing a route',async()=>{
  const x=setup();
  try{
    x.d.querySelector('#ct-auto-dwell').value='15';await x.submit();
    assert.equal(x.d.querySelector('#ct-auto-results').childElementCount,0);
    assert.equal(x.d.querySelector('#ct-auto-unavailable').open,true);
    assert.equal(x.d.querySelectorAll('#ct-auto-other-results .ct-auto-unavailable').length,3);
    assert.match(x.d.querySelector('#ct-auto-result-heading').textContent,/No tour fits/);
    assert.equal(x.d.querySelector('#ct-auto-submit').disabled,false);
  }finally{x.dom.window.close();}
});

test('the first usable result receives focus even when disabling the search button blurs it',async()=>{
  let finishWalking;const wait=new Promise(resolve=>{finishWalking=resolve;});
  const x=setup({walkingWait:wait});x.d.querySelector('#ct-auto-submit').focus();const job=x.submit();
  try{
    x.d.body.tabIndex=-1;x.d.body.focus();assert.equal(x.d.activeElement,x.d.body);await flush();finishWalking();await job;
    assert.equal(x.d.activeElement,x.d.querySelector('#ct-auto-result-heading'));
  }finally{finishWalking();await job;x.dom.window.close();}
});
