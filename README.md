# datacenter

**Data Center Footprint Observatory** — a sourced dashboard and rapid scoping review of data centers, AI services, environmental health and public responsibility in the United States.

Research snapshot: **1 October 2026 · version 1.2**.

## Explore locally

The dashboard uses plain HTML, CSS and JavaScript. No API key, package installation or build step is required.

```bash
python3 -m http.server 8000 --directory site
```

Open [http://localhost:8000](http://localhost:8000).

## Included

- Plain-language consumer guide, environmental claim decoder and questions for public meetings.
- Twenty environmental assessment metrics, with units, boundaries, methods, monitoring, evidence requirements, tradeoffs and coverage gaps.
- Applications to Indiana facilities, California facilities and AI procurement.
- California policy register separating enactment, effective dates, implementation deadlines and proposed procurement safeguards.
- CivicShield/NAWEI crosswalk connecting alternatives, workforce outcomes, mitigation and monitoring with a separate physical environmental inventory.
- Fifty-state electricity model, a selected campus-water ledger and an Indiana policy case study.
- Ten annotated policy-research readings, a searchable 86-source register, bibliography and 33-page review.
- An illustrative AI scenario calculator showing how workload growth, efficiency, electricity intensity, water and added embodied emissions interact.

## Research files

| File | Contents |
| --- | --- |
| [Review PDF](site/review.pdf) | Cited synthesis, metric framework, state applications, California policy and bibliography |
| [Evidence register](site/evidence-register.json) | Dashboard dataset, source metadata and limitations |
| [Metric dictionary](site/environmental-metrics.csv) | Twenty assessment specifications |
| [California policy](site/california-policy.csv) | Thirteen policy and program records |
| [Assessment data](site/assessment-data.json) | Metrics, applied evidence, missing data and CivicShield crosswalk |
| [State electricity](site/state-electricity.csv) | EPRI historical model and future scenario rows |
| [Campus water](site/campus-water.csv) | Selected company-reported water balances |
| [Reading list](site/policy-reading-list.csv) | Ten selected studies with policy relevance and research questions |
| [Search log](site/search-log.json) | Executed searches, source verification and access limits |
| [BibTeX](site/bibliography.bib) / [RIS](site/bibliography.ris) | Bibliography exports |
| [Consumer guide](site/consumer-guide.html) | Printable plain-language companion |

## Interpretation

This is a rapid structured **scoping review**, not an exhaustive systematic review. It does not claim to identify all published literature, establish a complete PRISMA screening denominator or provide independent duplicate screening. Publication and access status are recorded, including selected preprints and an accepted manuscript.

The EPRI state model covers data centers **and cryptocurrency mining**; it is not a utility-meter census or an AI-only series. Future pathways are conditional scenarios, not confidence intervals. The water ledger is a selected Google campus sample, not statewide industry totals; it contains no California or Indiana campus. Missing observations remain unknown.

The metric framework defines how to assess impacts. It does not establish a complete environmental assessment of any individual campus. Source, period, geography, allocation and uncertainty must accompany each measurement. Environmental indicators are not collapsed into an unvalidated composite impact score.

California legal summaries distinguish enacted statutes from effective and implementation dates. The proposed AI environmental/workforce procurement annex is a research and policy recommendation, not an existing universal mandate. The CivicShield/NAWEI materials are prototype design inputs; their weights and scores are not validated outcome probabilities or legal clearance.

The calculator uses hypothetical inputs and limited accounting boundaries. It cannot certify carbon neutrality or zero environmental impact. Study findings and third-party data remain subject to their original sources and terms.

## Structure and validation

`site/` contains the complete static application, editable source code and downloadable research artifacts. The page's embedded `research-data` JSON must match `site/evidence-register.json` when updating the snapshot.

```bash
python3 scripts/validate.py
node --check site/app.js
```

Validation checks dataset references, bibliography counts, local downloads, metric coverage and the embedded data copy. The interface was also checked at desktop and mobile widths. Updates should preserve the evidence distinctions above, verify policy status against primary sources and document the new search date.

## Prospective collection (v2.0)

The live dashboard now has a persistent filing ledger, source review and correction history, an automatic collector for CEC docket 26-SPPE-01, a ten-record curated historical baseline, and a cited for/against decision guide. New discoveries remain unreviewed. No project verdict is automatically generated.

The full application is in `web/`; see [runtime instructions](web/README.md) and [collection protocol](web/UPDATE_PROTOCOL.md). The `site/` directory remains a static reader with the dated baseline. Persistent writes and the collector require the full application and database, not a static file server.

The research review remains v1.2 with its original 1 October 2026 cutoff. Prospective filings have their own dates and review status. Cleanview and TrackDataCenters are discovery sources; no commercial API connection or comprehensive national monitoring is claimed.

## Consumer literacy and electricity comparisons

The Start here guide now distinguishes enterprise, colocation, cloud, hyperscale, edge and campus terminology; training and inference; and proposal records versus operating facilities. Supplemental primary sources are linked beside the explanations.

The electricity-scale calculator compares an illustrative total-facility capacity scenario or an entered full-year MWh total with EIA 2024 residential electricity consumption per customer (50 states, DC and U.S.). It displays assumptions, calendar hours, formulas and the fixed denominator year. This is an electricity-equivalence comparison, not an estimate of homes affected, costs, emissions or water. Downloadable CSV/JSON files retain source provenance. These supplemental consumer resources do not change the 86-record review corpus or the review PDF.

Sources added to consumer resources: U.S. EIA, Table 5a, 2024 Average Monthly Bill—Residential (released 2025-10-07); AWS, What is a Data Center? (undated); Apple Machine Learning Research, Introducing Apple’s On-Device and Server Foundation Models (2024-06-10, updated 2024-07-29). All accessed 2026-10-01.
