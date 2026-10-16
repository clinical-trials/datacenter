const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readRoute,assessTime,readGeocodes,formatTime,routeKey}=require('../site/tour-routing-model.js');
const line={type:'LineString',coordinates:[[-106.65,35.08],[-106.64,35.09]]};
const fixture=()=>JSON.parse(JSON.stringify({code:'Ok',waypoints:[{location:line.coordinates[0],distance:3},{location:line.coordinates[1],distance:4}],routes:[{duration:300.1,distance:400,geometry:line,legs:[{duration:300.1,distance:400,steps:[{geometry:line}]}]}]}));
test('uses routed seconds, including just-over-budget trips, not rounded display minutes',()=>{
 const route=readRoute(fixture(),2);
 assert.equal(assessTime(route,5,0,2).fits,false);
 assert.equal(assessTime(route,10,0,2).fits,true);
 assert.equal(assessTime(route,10,3,2).total,660.1);
 assert.equal(assessTime(route,10,3,2).fits,false);
 assert.equal(assessTime(route,NaN,0,2),null);
 assert.equal(assessTime(route,10,-1,2),null);
 assert.equal(formatTime(300.1),'5 min 1 sec');
});
test('rejects missing legs, impossible metrics, distant snapping and unroutable responses',()=>{
 assert.throws(()=>readRoute({code:'NoRoute'},2));
 let d=fixture();d.routes[0].legs=[];assert.throws(()=>readRoute(d,2));
 d=fixture();d.routes[0].duration=-1;assert.throws(()=>readRoute(d,2));
 d=fixture();d.waypoints[1].distance=501;assert.throws(()=>readRoute(d,2));
 d=fixture();d.routes[0].geometry.coordinates[0]=[500,35];assert.throws(()=>readRoute(d,2));
 d=fixture();d.routes[0].legs[0].duration=600;assert.throws(()=>readRoute(d,2));
});
test('arrival times are cumulative and return legs do not add a second visit at the start',()=>{
 const d=fixture();d.waypoints.push(d.waypoints[0]);d.routes[0].legs.push({...d.routes[0].legs[0],duration:200});d.routes[0].duration=500.1;
 const fit=assessTime(readRoute(d,3),15,2,2);
 assert.deepEqual(fit.arrivals,[0,420.1,740.1]);
 assert.equal(fit.total,740.1);
});
test('geocoding never substitutes a city centroid or silently selects an ambiguous address',()=>{
 assert.deepEqual(readGeocodes({result:{addressMatches:[]}}),[]);
 const match={matchedAddress:'505 MARQUETTE AVE NW, ALBUQUERQUE, NM, 87102',coordinates:{x:-106.652,y:35.088}};
 assert.equal(readGeocodes({result:{addressMatches:[match,match]}}).length,2);
 assert.equal(readGeocodes({result:{addressMatches:[{...match,coordinates:{x:999,y:35}}]}}).length,0);
});
test('route cache identity changes with stop order and round trip, not notes',()=>{
 const a=[{address:'A'},{address:'B'}];
 assert.notEqual(routeKey(a,false),routeKey([...a].reverse(),false));
 assert.notEqual(routeKey(a,false),routeKey(a,true));
 assert.equal(routeKey(a,false),routeKey(a.map(s=>({...s,note:'private'})),false));
});
