const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const modelPath = path.join(__dirname, '../site/tour-model.js');
test('tour routing model is available', () => assert.ok(fs.existsSync(modelPath)));
if (fs.existsSync(modelPath)) {
  const { normalizeStop, routeSegments, parseAddresses } = require(modelPath);
  const stops = Array.from({length:12}, (_,i) => ({name:'Stop '+i,address:`${i+1} Main St, Test, NM 87102`}));
  test('phone routes preserve all stops in order with at most three waypoints', () => {
    for (let n=2;n<=12;n++) {
      const segments = routeSegments(stops.slice(0,n),'walking');
      const reconstructed = [];
      segments.forEach((s,i) => {
        const u = new URL(s.url);
        const points = [u.searchParams.get('origin'),...(u.searchParams.get('waypoints')?.split('|')||[]),u.searchParams.get('destination')];
        assert.ok(points.length<=5);
        assert.equal(u.searchParams.get('travelmode'),'walking');
        if(i) assert.equal(points[0],reconstructed.at(-1));
        reconstructed.push(...(i?points.slice(1):points));
        assert.ok(s.url.length<=2048);
      });
      assert.deepEqual(reconstructed,stops.slice(0,n).map(s=>s.address));
    }
    assert.deepEqual(routeSegments([], 'driving'), []);
    assert.deepEqual(routeSegments(stops.slice(0,1),'driving'), []);
  });
  test('restored stops reject missing addresses, unsafe sources and non-string notes', () => {
    assert.equal(normalizeStop({name:'x'}),null);
    const x=normalizeStop({name:'Example',address:'100 Main St, NM 00123',source:'javascript:alert(1)',note:{bad:true}});
    assert.equal(x.source,''); assert.equal(x.note,''); assert.ok(x.address.includes('00123'));
    assert.equal(normalizeStop({name:'Example',address:'a|b'}),null);
  });
  test('pasted addresses preserve order, optional names and leading-zero ZIPs', () => {
    const parsed=parseAddresses('  10 Main St, Boston, MA 02108\n\nLibrary — 20 Main St, Boston, MA 02108  ');
    assert.equal(parsed.error,'');
    assert.deepEqual(parsed.stops.map(s=>s.address),['10 Main St, Boston, MA 02108','20 Main St, Boston, MA 02108']);
    assert.equal(parsed.stops[1].name,'Library');
    assert.equal(parsed.stops[0].verification,'User-added · address not verified');
    for(const text of ['', 'Place — ', '1 Main St|2 Main St', 'x'.repeat(181), Array(13).fill('10 Main St').join('\n')]) {
      assert.ok(parseAddresses(text).error);
      assert.equal(parseAddresses(text).stops.length,0);
    }
  });
}
