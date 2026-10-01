import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  validateRecord, safeUrl, date, recordKey, requestGuard, readBody,
} from '../lib/ledger-validation.mjs';

const site = new URL('..', import.meta.url).pathname;
const origin = 'https://observatory.example';
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const fixture = (overrides = {}) => ({
  project: 'Example campus', state: 'IN', locality: 'Example county',
  title: 'Water supply application', url: 'https://agency.example/filings/1',
  filedDate: '2026-01-20', accessedDate: today,
  documentType: 'application', projectPhase: 'under-review',
  docket: 'DC-2026-001', summary: 'Proposed maximum withdrawal reported in the application.',
  limitations: 'Proposed withdrawal is not measured consumption.',
  metrics: [{ name: 'Maximum withdrawal', value: 4, unit: 'MGD', boundary: 'Proposed peak direct site withdrawal; no measured consumption' }],
  ...overrides,
});
const writeRequest = (headers = {}, body = '{}') => new Request(`${origin}/api/ledger`, {
  method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body,
});

test('normal intake retains quantitative value, unit and boundary while normalizing state', () => {
  const result = validateRecord(fixture({ state: 'in', project: ' Example campus ' }));
  assert.equal(result.state, 'IN');
  assert.equal(result.project, 'Example campus');
  assert.deepEqual(result.metrics, fixture().metrics);
  assert.equal(result.filedDate, '2026-01-20');
});

test('dates accept real calendar days, including leap day and today', () => {
  for (const value of ['2024-02-29', '2025-12-31', today]) assert.equal(date(value, 'date'), value);
});

test('dates reject malformed, impossible and future dates', () => {
  for (const value of ['2025-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-1-01', 'not a date', tomorrow]) {
    assert.throws(() => date(value, 'date'), /Invalid or future/);
  }
  assert.throws(() => validateRecord(fixture({ filedDate: tomorrow })), /future filing date/);
  assert.throws(() => validateRecord(fixture({ accessedDate: tomorrow })), /future access date/);
});

test('publication-only evidence preserves its date type without inventing a filing date', () => {
  const record = validateRecord(fixture({ filedDate: undefined, publishedDate: '2026-01-19', documentType: 'research' }));
  assert.equal(record.filedDate, null);
  assert.equal(record.publishedDate, '2026-01-19');
  assert.equal(record.documentDate, '2026-01-19');
  assert.equal(record.dateKind, 'published');
  assert.throws(() => validateRecord(fixture({ filedDate: undefined, publishedDate: tomorrow })), /future publication date/);
  assert.throws(() => validateRecord(fixture({ filedDate: undefined, publishedDate: undefined })));
});

test('unknown metrics can be omitted; invalid numbers or missing units/boundaries cannot enter', () => {
  assert.deepEqual(validateRecord(fixture({ metrics: undefined })).metrics, []);
  for (const value of [-1, Infinity, NaN, '4', null]) {
    assert.throws(() => validateRecord(fixture({ metrics: [{ ...fixture().metrics[0], value }] })), /finite, non-negative/);
  }
  for (const field of ['unit', 'boundary']) {
    assert.throws(() => validateRecord(fixture({ metrics: [{ ...fixture().metrics[0], [field]: '' }] })), /Invalid metric/);
  }
  assert.throws(() => validateRecord(fixture({ metrics: '4 MGD' })), /Metrics must be an array/);
  assert.throws(() => validateRecord(fixture({ metrics: Array.from({ length: 13 }, () => fixture().metrics[0]) })), /At most 12/);
});

test('undated brochures retain an observation date without inventing publication or filing', () => {
  const r = validateRecord(fixture({filedDate:null,publishedDate:null,observedDate:'2026-01-20',sourceSha256:'a'.repeat(64)}));
  assert.equal(r.filedDate,null); assert.equal(r.publishedDate,null);
  assert.equal(r.observedDate,'2026-01-20'); assert.equal(r.dateKind,'observed');
  assert.equal(r.documentDate,'2026-01-20'); assert.equal(r.sourceSha256,'a'.repeat(64));
  assert.throws(()=>validateRecord(fixture({filedDate:null,observedDate:tomorrow})));
  assert.throws(()=>validateRecord(fixture({sourceSha256:'not-a-sha256'})));
});

test('re-observing an undated copy does not duplicate it; different source fingerprints stay distinct', async () => {
  const base={filedDate:null,publishedDate:null,observedDate:'2026-01-20',sourceSha256:'a'.repeat(64)};
  const a=validateRecord(fixture(base));
  const b=validateRecord(fixture({...base,observedDate:'2026-02-20'}));
  const c=validateRecord(fixture({...base,sourceSha256:'b'.repeat(64)}));
  assert.equal(await recordKey(a),await recordKey(b));
  assert.notEqual(await recordKey(a),await recordKey(c));
});

test('an imported record cannot self-assign source-checked status or a reviewer identity', () => {
  const result = validateRecord(fixture({ reviewStatus: 'source-checked', reviewer: 'Verified official', reviewNote: 'Already confirmed', version: 999 }));
  assert.equal(result.reviewStatus, 'unreviewed');
  assert.equal(Object.hasOwn(result, 'reviewer'), false);
  assert.equal(Object.hasOwn(result, 'reviewNote'), false);
  assert.equal(Object.hasOwn(result, 'version'), false);
});

test('tracking parameters, fragments, query order, and project whitespace do not duplicate one filing', async () => {
  const a = validateRecord(fixture({ project: ' Example   Campus ', url: 'https://agency.example/filings?id=1&sort=date&utm_source=email#section-2' }));
  const b = validateRecord(fixture({ project: 'example campus', url: 'https://agency.example/filings?gclid=tracked&sort=date&id=1&fbclid=tracked' }));
  assert.equal(await recordKey(a), await recordKey(b));
});

test('separate projects, states, and document-specific query values remain distinct', async () => {
  const a = validateRecord(fixture());
  for (const changes of [{ project: 'Second campus' }, { state: 'CA' }, { url: 'https://agency.example/filings/1?document=2' }]) {
    assert.notEqual(await recordKey(a), await recordKey(validateRecord(fixture(changes))));
  }
});

test('a later filing at a stable URL is not silently deduplicated into the older document', async () => {
  const older = validateRecord(fixture());
  const newer = validateRecord(fixture({ filedDate: '2026-02-20', docket: 'DC-2026-002', title: 'Revised water supply application' }));
  assert.notEqual(await recordKey(older), await recordKey(newer));
});

test('non-HTTPS and credential-bearing source URLs are rejected', () => {
  for (const url of ['http://agency.example/a', 'javascript:alert(1)', 'file:///etc/passwd', 'https://user:password@agency.example/a', '/relative']) {
    assert.throws(() => safeUrl(url));
  }
});

test('source URL validation and identity never dereference an attacker-selected URL (no SSRF)', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Unexpected fetch'); };
  try {
    const result = validateRecord(fixture({ url: 'https://127.0.0.1/private' }));
    assert.equal(result.url, 'https://127.0.0.1/private');
    await recordKey(result);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
  // Record URLs are evidence links only: ingestion/routes contain no remote fetch.
  const modules = await Promise.all(['lib/ledger-validation.mjs', 'lib/ledger.ts', 'app/api/ledger/route.ts', 'app/api/checks/route.ts', 'app/api/export/route.ts'].map(path => readFile(`${site}/${path}`, 'utf8')));
  for (const source of modules) assert.doesNotMatch(source, /\bfetch\s*\(|\b(?:https?|undici|axios)\b.*\b(?:require|import)\b/);
});

test('same-origin and originless service writes are supported', () => {
  assert.doesNotThrow(() => requestGuard(writeRequest({ origin })));
  assert.doesNotThrow(() => requestGuard(writeRequest()));
  assert.doesNotThrow(() => requestGuard(new Request(`${origin}/api/ledger`)));
});

test('cross-site writes, null origins, and simple form submissions are rejected', () => {
  for (const headers of [
    { origin: 'https://unrelated.example' },
    { origin: 'null' },
    { origin, 'sec-fetch-site': 'cross-site' },
    { 'sec-fetch-site': 'cross-site' },
  ]) assert.throws(() => requestGuard(writeRequest(headers)), /Cross-site writes/);
  for (const contentType of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
    assert.throws(() => requestGuard(writeRequest({ 'content-type': contentType })), /application\/json/);
  }
});

test('request-body parser rejects malformed JSON and over-limit imports before validation', async () => {
  assert.deepEqual(await readBody(writeRequest({ origin }, '{"action":"import","records":[]}')), { action: 'import', records: [] });
  await assert.rejects(readBody(writeRequest({ origin }, '{')), SyntaxError);
  await assert.rejects(readBody(writeRequest({ origin }, JSON.stringify({ value: 'x'.repeat(250001) }))), /too large/);
});
