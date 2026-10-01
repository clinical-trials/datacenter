"""Validate the published static research snapshot using Python's standard library."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from zipfile import ZipFile
import json
import re

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.embedded = []
        self.in_data = False
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'a' and a.get('href'):
            self.links.append(a['href'])
        if tag == 'script' and a.get('id') == 'research-data':
            self.in_data = True
    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_data = False
    def handle_data(self, text):
        if self.in_data:
            self.embedded.append(text)

data = json.loads((SITE / 'evidence-register.json').read_text())
sources = {s['id']: s for s in data['sources']}
assert len(sources) == len(data['sources'])
assert len(data['environmentalMetrics']) == 20
assert len(data['metricApplication']['cases']) == 3
assert len(data['states']) == 51  # 50 states plus the national row; no DC row.

def check_refs(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if key == 'sourceIds':
                assert all(s in sources for s in item), item
            elif key == 'sourceId':
                assert item in sources, item
            else:
                check_refs(item)
    elif isinstance(value, list):
        for item in value:
            check_refs(item)

check_refs(data)
for name in ('index.html', 'review.html', 'consumer-guide.html'):
    page = Page()
    text = (SITE / name).read_text()
    page.feed(text)
    assert len(page.ids) == len(set(page.ids)), name
    for link in page.links:
        parts = urlsplit(link)
        if not parts.scheme and not parts.netloc and parts.path:
            assert (SITE / parts.path).is_file(), (name, link)
    assert '/Users/' not in text, f'Local path in {name}'
    if name == 'index.html':
        assert json.loads(''.join(page.embedded)) == data

assert len(re.findall(r'^@', (SITE / 'bibliography.bib').read_text(), re.M)) == len(sources)
assert (SITE / 'bibliography.ris').read_text().count('ER  - ') == len(sources)
metric_ids = {m['id'] for m in data['environmentalMetrics']}
for case in data['metricApplication']['cases']:
    assert case['missingData']
    for evidence in case['evidence']:
        assert set(evidence['metricIds']) <= metric_ids
        assert evidence['status'] and evidence['boundary']
with ZipFile(SITE / 'evidence-data.zip') as archive:
    for name in archive.namelist():
        assert archive.read(name) == (SITE / name).read_bytes(), name
for path in SITE.rglob('*'):
    if path.is_file() and path.suffix in {'.json', '.csv', '.html', '.js', '.css'}:
        assert '/Users/' not in path.read_text(), f'Local path in {path.name}'
print(f'Validated {len(sources)} sources, 20 metrics, 3 applications, linked downloads and bibliography exports.')
