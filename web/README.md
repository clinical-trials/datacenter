# Data Center Footprint Observatory

A research dashboard for consumers and scientists, with a persistent prospective filing ledger and a cited, explicitly editorial decision guide.

Research synthesis: v1.2, cutoff 1 October 2026, 86 sources, 20 metric definitions, 50-state electricity model, 23-campus water sample, Indiana and California policy analysis. Prospective collection: v2.0, beginning 1 October 2026, with ten curated baseline filings/comments/notices. It is a selected watchlist, not a census.

## Run locally

Node 22.13+; install with `npm ci`, then `npm run build`. Apply pending Drizzle migrations to the local database using the commands in `UPDATE_PROTOCOL.md` and the standard Sites build configuration; run `npm run dev -- --port 5173`. Local development binds loopback. Production requires the declared D1 binding and the owner-private Sites dispatch boundary.

Local migration command for the initial schema:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clean_shadow_king.sql
```

Only run unapplied migrations. Seed data are imported through the authenticated ledger API; they are not schema migrations. Publication applies production schema changes separately.

## Product and maintenance

- `dashboard/index.html`, `public/app.js`, `public/style.css`: retained research dashboard.
- `public/prospective.js` and `.css`: project watch, import, source review/correction history, and for/against guide.
- `lib/ledger-validation.mjs`: date, unit, source URL and import validation.
- `lib/ledger.ts`, `app/api/`: persistent data access with prepared SQL, atomic imports and version-checked reviews/corrections.
- `lib/cec-collector.mjs`: bounded, allowlisted official CEC docket metadata parser.
- `public/filing-sources.json`, `filing-baseline.json`, `decision-framework.json`: provenance and curated content.
- `UPDATE_PROTOCOL.md`: supported unattended access, source-by-source collection and readback procedure.

New imports and automatic discoveries are always unreviewed. Source checking never establishes environmental safety. Corrections retain prior structured payloads and return the record to review. Source documents themselves are not archived. Original full-text copies and an independent review protocol remain necessary for a reproducible formal systematic review.

The overall editorial position is conditional support for useful computing with enforceable resource, health, public-cost and accountability conditions. No per-project verdict is automatically generated, and no arbitrary composite score hides an unresolved local burden.

Cleanview requires licensed API access; no credential is configured. TrackDataCenters automated access was blocked. Both remain discovery resources with access limitations shown in the source directory.

## Checks

`node --test tests/ledger-validation.test.mjs` verifies dates, unknown metrics, boundaries, deduplication, source-review defaults and cross-site write protection. The initial implementation also passed local persistent API integration, correction/history/conflict checks, real CEC parser and fetch checks, browser submission/filters, and responsive layout review. The research snapshot retains its separately documented limitations.

## Security boundary

Keep the Site owner-private unless explicit server-side authorization is added to every write route. Platform service access supports unattended writes without impersonating a visitor. Never place service credentials or vendor API keys in source, browser code, documentation or automation prompts. Do not change the audience as part of routine maintenance.

## Consumer literacy and electricity comparisons

The Start here guide now distinguishes enterprise, colocation, cloud, hyperscale, edge and campus terminology; training and inference; and proposal records versus operating facilities. Supplemental primary sources are linked beside the explanations.

The electricity-scale calculator compares an illustrative total-facility capacity scenario or an entered full-year MWh total with EIA 2024 residential electricity consumption per customer (50 states, DC and U.S.). It displays assumptions, calendar hours, formulas and the fixed denominator year. This is an electricity-equivalence comparison, not an estimate of homes affected, costs, emissions or water. Downloadable CSV/JSON files retain source provenance. These supplemental consumer resources do not change the 86-record review corpus or the review PDF.

Sources added to consumer resources: U.S. EIA, Table 5a, 2024 Average Monthly Bill—Residential (released 2025-10-07); AWS, What is a Data Center? (undated); Apple Machine Learning Research, Introducing Apple’s On-Device and Server Foundation Models (2024-06-10, updated 2024-07-29). All accessed 2026-10-01.

## Richmond operator evidence

The prospective ledger now includes the supplied Iron Mountain Richmond campus brochure as operator evidence, with seven explicitly bounded quantities and no inferred operating water or emissions data. Its publication/filing date is unknown, so observation on 2026-10-01 is labeled separately. Source-copy SHA-256 identifies the supplied PDF; the matching-text public copy has a different file fingerprint. Conflicting operator schedules, missing certificate details and required environmental measurements remain visible. The original PDF is not redistributed in this repository.

[Structured Richmond evidence](public/richmond-brochure-evidence.json) supplements the 86-source review rather than changing the scholarly corpus. Undated records support explicit observedDate and optional sourceSha256; repeated observation alone does not duplicate a document.
