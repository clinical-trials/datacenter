"""Reconcile the dated engineering supplement into public citation exports."""
from pathlib import Path
import csv
import io
import json
import re
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'
data = json.loads((SITE / 'evidence-register.json').read_text())
supplement = json.loads((SITE / 'green-practices.json').read_text())
ids = {s['id'] for s in supplement['sources']}
old_numbers = {s['id']: s['number'] for s in data['sources'] if s['id'] in ids}
data['sources'] = [s for s in data['sources'] if s['id'] not in ids]
next_number = max(s['number'] for s in data['sources']) + 1
for offset, original in enumerate(supplement['sources']):
    source = dict(original)
    source['number'] = old_numbers.get(source['id'], next_number + offset)
    data['sources'].append(source)
data.setdefault('supplements', {})['greenEngineering'] = {
    'reviewed': supplement['reviewed'], 'sourceIds': sorted(ids),
    'scope': supplement['scope'],
    'originalReviewCutoff': '2026-10-01',
}
(SITE / 'evidence-register.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

fields = list(csv.DictReader(io.StringIO((SITE / 'evidence-register.csv').read_text())).fieldnames)
fields += sorted({k for s in data['sources'] for k in s} - set(fields))
with (SITE / 'evidence-register.csv').open('w', newline='') as stream:
    writer = csv.DictWriter(stream, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v
                     for k, v in s.items()} for s in data['sources'])

def bib_value(value):
    return str(value).replace('&', r'\&').replace('%', r'\%')

marker = '% Engineering evidence supplement - reviewed 2026-11-17'
bib = (SITE / 'bibliography.bib').read_text().split(marker)[0].rstrip()
blocks = []
ris = []
for s in data['sources']:
    if s['id'] not in ids:
        continue
    authors = s['authors'].split('; ')
    author = ' and '.join(authors) if len(authors) > 1 else '{' + authors[0] + '}'
    fields_bib = {'title': s['title'], 'author': author, 'url': s['url'],
                  'note': s['type'] + '; ' + s['limitations'] + '; accessed ' + s['accessed']}
    if s.get('year'):
        fields_bib['year'] = s['year']
    else:
        fields_bib['note'] += '; publication date not stated (n.d.)'
    if s.get('doi'):
        fields_bib['doi'] = s['doi']
    if s.get('institution'):
        fields_bib['institution'] = s['institution']
    if s.get('bibType') == 'article':
        fields_bib['journal'] = s['venue']
    blocks.append('@' + s.get('bibType', 'misc') + '{' + s['id'] + ',\n' + ',\n'.join(
        '  ' + k + ' = {' + bib_value(v) + '}' for k, v in fields_bib.items()) + '\n}')
    ris_type = {'techreport': 'RPRT', 'article': 'JOUR'}.get(s.get('bibType'), 'ELEC')
    lines = ['TY  - ' + ris_type,
             'ID  - ' + s['id'], 'TI  - ' + s['title']]
    lines += ['AU  - ' + a for a in authors]
    if s.get('year'):
        lines.append('PY  - ' + str(s['year']))
    lines += ['UR  - ' + s['url'], 'Y2  - ' + s['accessed']]
    if s.get('doi'):
        lines.append('DO  - ' + s['doi'])
    if s.get('venue'):
        lines.append('T2  - ' + s['venue'])
    lines += ['N1  - ' + fields_bib['note'], 'ER  -']
    ris.append('\n'.join(lines))
(SITE / 'bibliography.bib').write_text(bib + '\n\n' + marker + '\n\n' + '\n\n'.join(blocks) + '\n')
(SITE / 'green-practices.bib').write_text(marker + '\n\n' + '\n\n'.join(blocks) + '\n')
original_ris = (SITE / 'bibliography.ris').read_text()
old_blocks = re.findall(r'(?ms)^TY  - .*?^ER  -[ \t]*(?=\n|$)', original_ris)
kept = ['\n'.join(line.rstrip() for line in b.splitlines()) for b in old_blocks
        if not any('ID  - ' + sid + '\n' in b for sid in ids)]
(SITE / 'bibliography.ris').write_text('\n\n'.join(kept + ris) + '\n')
(SITE / 'green-practices.ris').write_text('\n\n'.join(ris) + '\n')

index = (SITE / 'index.html').read_text()
index, count = re.subn(r'(<script[^>]*id="research-data"[^>]*>).*?(</script>)',
                      lambda m: m[1] + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + m[2],
                      index, count=1, flags=re.S)
assert count == 1, 'Embedded research register not found'
(SITE / 'index.html').write_text(index)
with ZipFile(SITE / 'evidence-data.zip') as archive:
    names = archive.namelist()
for name in ['green-practices.json', 'green-practices.bib', 'green-practices.ris']:
    if name not in names:
        names.append(name)
with ZipFile(SITE / 'evidence-data.zip', 'w', ZIP_DEFLATED) as archive:
    for name in names:
        archive.write(SITE / name, name)
for name in ['evidence-register.json', 'evidence-register.csv', 'bibliography.bib',
             'bibliography.ris', 'evidence-data.zip', 'green-practices.json',
             'green-practices.bib', 'green-practices.ris']:
    (ROOT / 'web' / 'public' / name).write_bytes((SITE / name).read_bytes())
(ROOT / 'web' / 'dashboard' / 'index.html').write_bytes((SITE / 'index.html').read_bytes())
print(f'Added {len(ids)} engineering records; {len(data["sources"])} total sources. Canonical exports, embedded data, archive and mirrors reconciled.')
