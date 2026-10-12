"""Rebuild the address supplement from a saved OSM query and reviewed operator facts.

No nearest-neighbor-only joins: require an exact normalized name, compatible
operator, <=25 m separation and a single unambiguous street/unit address.
The existing IM3 location layer and its facility counts are never altered.
"""
import hashlib
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OSM = ROOT / 'data/nearby-address-osm-2026-10-12.json'
LOCATIONS = ROOT / 'site/nearby-locations.geojson'

def norm(value):
    return re.sub(r'[^a-z0-9]', '', str(value or '').lower())

def distance(a, b):
    return math.hypot((a[0] - b[0]) * 111320 * math.cos(math.radians(a[1])), (a[1] - b[1]) * 111320)

def identity(feature):
    p = feature['properties']
    return {'name': p.get('name'), 'state_abb': p['state_abb'], 'coordinates': feature['geometry']['coordinates']}

def main():
    features = json.loads(LOCATIONS.read_text())['features']
    source = json.loads(OSM.read_text())
    assert 'remark' not in source, 'Incomplete OSM response'
    records = {}
    for index, feature in enumerate(features):
        p = feature['properties']
        candidates = []
        for item in source['elements']:
            t = item['tags']
            c = item.get('center', item)
            if not t.get('addr:housenumber') or not t.get('name'):
                continue
            meters = distance(feature['geometry']['coordinates'], [c['lon'], c['lat']])
            if meters > 25 or norm(p.get('name')) != norm(t['name']):
                continue
            if p.get('operator') and t.get('operator') and norm(p['operator']) != norm(t['operator']):
                continue
            candidates.append((meters, item))
        addresses = {(o['tags'].get('addr:housenumber'), o['tags'].get('addr:street'), o['tags'].get('addr:unit'), o['tags'].get('addr:suite')) for _, o in candidates}
        if not candidates or len(addresses) != 1:
            continue
        meters, item = min(candidates, key=lambda x: x[0])
        t = item['tags']
        street = t['addr:housenumber'] + ' ' + t['addr:street']
        if t.get('addr:unit'): street += ', Unit ' + t['addr:unit']
        if t.get('addr:suite'): street += ', Suite ' + t['addr:suite']
        records[index] = {'location_index': index, 'match': identity(feature), 'street': street,
            'city': t.get('addr:city', ''), 'state': t.get('addr:state', p['state_abb']),
            'postcode': t.get('addr:postcode', ''), 'verification': 'community-mapped',
            'source_name': 'OpenStreetMap contributors', 'source_url': f"https://www.openstreetmap.org/{item['type']}/{item['id']}",
            'checked_on': '2026-10-12', 'match_distance_m': round(meters, 3)}
    for checked in json.loads((ROOT / 'data/nearby-address-operator-checks.json').read_text()):
        checked = checked.copy()
        index = checked['location_index']
        assert features[index]['properties']['name'] == checked.pop('expected_name'), 'Operator record identity changed'
        previous = records.get(index, {})
        checked['match'] = identity(features[index])
        if previous: checked['corroborating_map_url'] = previous['source_url']
        records[index] = checked
    ordered = [records[i] for i in sorted(records)]
    jurisdictions = sorted({features[i]['properties']['state_abb'] for i in records})
    output = {'schema_version': 1, 'retrieved': '2026-10-12', 'source_snapshot_at': source['osm3s']['timestamp_osm_base'],
        'location_sha256': hashlib.sha256(LOCATIONS.read_bytes()).hexdigest(),
        'osm_response_sha256': hashlib.sha256(OSM.read_bytes()).hexdigest(),
        'records_count': len(ordered), 'jurisdictions': jurisdictions,
        'operator_facility_records': sum(r['verification'] == 'operator-facility' for r in ordered),
        'operator_contact_records': sum(r['verification'] == 'operator-contact' for r in ordered),
        'license': 'ODbL-1.0', 'license_url': 'https://opendatacommons.org/licenses/odbl/1-0/',
        'attribution': '© OpenStreetMap contributors. Operator facts carry individual source links.',
        'method': 'Exact normalized name, compatible operator when present, within 25 metres, unambiguous street/unit. Reviewed operator records override address fields only. Runtime identity guards reject changed rows.',
        'limitations': 'Incomplete address supplement to IM3 map records. No reverse-geocoded guesses. Community mapping is not independent verification. Several buildings may share an address. Address and map pin do not identify a public entrance, visitor permission, current phase or exposure.',
        'records': ordered}
    for destination in [ROOT / 'site', ROOT / 'web/public', ROOT / 'work/footprint-site/public']:
        (destination / 'nearby-addresses.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print(f"Wrote {len(ordered)} address records in {len(jurisdictions)} jurisdictions; {output['operator_facility_records']} operator facility sources and {output['operator_contact_records']} operator contact source.")

if __name__ == '__main__': main()
