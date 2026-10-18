#!/usr/bin/env python3
"""Build a labeled research index from a pinned CC-BY-4.0 source CSV.
Usage: python3 scripts/import-national-moratoria.py path/to/moratorium_inventory.csv
Download the input from SOURCE_URL below. No source rows are promoted to verified law.
"""
import csv, hashlib, io, json, re, sys
from pathlib import Path

REVISION = 'dbaab04d84f8d679ba5a3d57bf45f32186109222'
REPO = 'https://github.com/mjbommar/moratorium-data-2026'
SOURCE_URL = f'https://raw.githubusercontent.com/mjbommar/moratorium-data-2026/{REVISION}/data/moratorium_inventory.csv'
SOURCE_SHA256 = '7d6d252da231ec8e00fb4bba37489629f931cc9bd2bdaae796ee9c6d77e3f4c7'

def build(raw):
    if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
        raise ValueError('Input does not match the reviewed source revision. Review a new release before changing the pin.')
    records = []
    for row in csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))):
        if 'data_center' not in json.loads(row['sectors']) or row['jurisdiction_type'] == 'Aggregate meta-row':
            continue
        state_slug = row['state'].lower().replace(' ', '-')
        records.append(dict(id=row['moratorium_id'], state=row['state_abbrev'], jurisdiction=row['jurisdiction'],
            level=row['jurisdiction_type'], reportedStatus=row['enacted_status'],
            date=row['date_enacted_iso'] or None, datePrecision=row['date_enacted_uncertainty'],
            dateNote=row['date_enacted'], endDate=row['current_end_date_iso'] or None,
            term=row['duration'], basis=row['legal_basis'], detail=row['current_status'],
            flagged=row['has_verify_tags']=='True',
            sourceUrl=f'{REPO}/blob/{REVISION}/states/{state_slug}.md'))
    # Explicit correction; retain the original source prose for audit, not as current law.
    pima=next(r for r in records if r['id']=='az-pima-county-2026')
    pima['correction']={
        'text':'The source confuses the August 11 direction to draft a measure with adoption. The official record marks Resolution 2026-56 approved September 22, 2026. Use the reviewed Pima County case; do not rely on the source’s August adoption date or calculated December endpoint.',
        'url':'https://pima.legistar.com/LegislationDetail.aspx?GUID=633B4F2B-1303-4119-9A5C-44A7BC8A056B&ID=8215310&Options=&Search=',
        'reviewedId':'pima-az', 'checked':'2026-10-18'}
    assert len({r['id'] for r in records})==len(records)
    return dict(schemaVersion=1, sourceAsOf='2026-09-23', importedAt='2026-10-18',
        source=dict(title='Moratorium Nation', author='Michael J. Bommarito', url=REPO,
          revision=REVISION, csvUrl=SOURCE_URL, sha256=SOURCE_SHA256,
          citation='Bommarito, Michael J. (2026). Moratorium Nation: U.S. Infrastructure Moratorium Data [dataset], revision dbaab04, September 23, 2026.',
          license='CC-BY-4.0', licenseUrl='https://creativecommons.org/licenses/by/4.0/',
          changes='Filtered to data_center sector; excluded aggregate meta-rows; renamed and selected fields; preserved reported status and verification flags; added a cited Pima County correction. No legal-effect status independently assigned.'),
        coverage='A nationwide research directory, not a complete or current legal inventory. The source uses AI-assisted research and mixed official/news evidence. An imported date is not an independent verification date. Multiple instruments may describe one jurisdiction; aliases may occur. Statewide restrictions and permanent bans are not exhaustively covered. No entry does not establish no moratorium.',
        records=records)

if __name__=='__main__':
    result=build(Path(sys.argv[1]).read_bytes())
    target=Path(__file__).resolve().parents[1]/'site/moratoria-national.json'
    target.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    print(f"Imported {len(result['records'])} reported instruments in {len(set(r['state'] for r in result['records']))} states; no current-law claim.")
