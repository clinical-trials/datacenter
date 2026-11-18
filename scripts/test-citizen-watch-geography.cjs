const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../site/citizen-watch-model.js');
function tags(geography,title='Water study'){
 return model.buildFeed({sources:[{id:'test',title,geography,authors:'Research team',url:'https://example.org/study'}]})[0];
}
test('West Virginia does not inherit a Virginia state match',()=>{
 assert.deepEqual(tags('West Virginia, United States').states,['WV']);
 assert.deepEqual(tags('Virginia and West Virginia, United States').states,['VA','WV']);
});
test('county names do not become state matches while explicit multi-state labels remain valid',()=>{
 assert.deepEqual(tags('Indiana County, Pennsylvania').states,['PA']);
 assert.deepEqual(tags('Washington County, Pennsylvania').states,['PA']);
 assert.deepEqual(tags('Indiana and Pennsylvania, United States').states,['IN','PA']);
 assert.deepEqual(tags('New Mexico, Arizona and Texas, United States').states,['AZ','NM','TX']);
});
test('Georgia remains ambiguous without a U.S. qualifier and Washington DC stays distinct',()=>{
 assert.deepEqual(tags('Georgia').states,[]);
 assert.deepEqual(tags('Georgia, United States').states,['GA']);
 assert.deepEqual(tags('Washington, DC').states,['DC']);
 assert.deepEqual(tags('District of Columbia and Washington State').states,['WA','DC']);
});
test('meta-analysis does not identify Meta while named operator references still do',()=>{
 assert.deepEqual(tags('Global','A meta-analysis of air pollution').companies,[]);
 assert.deepEqual(tags('Global','Meta‐analyses of data center cooling').companies,[]);
 assert.deepEqual(tags('United States','Meta Platforms data center report').companies,['meta']);
 assert.deepEqual(tags('United States','Facebook server efficiency').companies,['meta']);
 assert.deepEqual(tags('United States',"Meta’s water report").companies,['meta']);
});
