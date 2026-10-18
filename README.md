# datacenter

**Data Center Footprint Observatory** — a sourced dashboard and rapid scoping review of data centers, AI services, environmental health and public responsibility in the United States.

## Open the dashboard

**[Launch the public Data Center Footprint Observatory →](https://clinical-trials.github.io/datacenter/)**

[Health & air quality](https://clinical-trials.github.io/datacenter/#health) · [Project watch](https://clinical-trials.github.io/datacenter/#ledger) · [Public comment](https://clinical-trials.github.io/datacenter/#citizen)

GitHub Pages serves the public dashboard from `site/`; the root `index.html` forwards visitors there while preserving the selected tab. This edition includes interactive charts, research downloads and public-comment tools, with dated baseline data. GitHub Pages cannot run the collection API or database, so live updates and saved filing edits are unavailable in this edition.

The **[full hosted application](https://datacenter-footprint-observatory.yoyoyoyoyoyoyoyoyoyoyo.chatgpt.site/#impact)** supports the persistent ledger and automated collection. It currently has owner-only access; opening this repository does not grant access to that application.

Research snapshot: **1 October 2026 · version 1.2**.

## Explore locally

The dashboard uses plain HTML, CSS and JavaScript. No API key, package installation or build step is required.

```bash
python3 -m http.server 8000 --directory site
```

Open [http://localhost:8000](http://localhost:8000).

## Included

- A visual opening dashboard with 50-state electricity tiles and scenario ranges, campus water-balance charts, interactive AI footprint comparisons, and selected local land and generator specifications. Sources and methods expand on demand.
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

The live dashboard now has a persistent filing ledger, source review and correction history, an automatic collector for CEC docket 26-SPPE-01, a curated baseline of ten historical records plus one Richmond operator brochure, and a cited for/against decision guide. New discoveries remain unreviewed. No project verdict is automatically generated.

The full application is in `web/`; see [runtime instructions](web/README.md) and [collection protocol](web/UPDATE_PROTOCOL.md). The `site/` directory remains a static reader with the dated baseline. Persistent writes and the collector require the full application and database, not a static file server.

The research review remains v1.2 with its original 1 October 2026 cutoff. Prospective filings have their own dates and review status. Cleanview and TrackDataCenters are discovery sources; no commercial API connection or comprehensive national monitoring is claimed.

## Consumer literacy and electricity comparisons

The Start here guide now distinguishes enterprise, colocation, cloud, hyperscale, edge and campus terminology; training and inference; and proposal records versus operating facilities. Supplemental primary sources are linked beside the explanations.

The electricity-scale calculator compares an illustrative total-facility capacity scenario or an entered full-year MWh total with EIA 2024 residential electricity consumption per customer (50 states, DC and U.S.). It displays assumptions, calendar hours, formulas and the fixed denominator year. This is an electricity-equivalence comparison, not an estimate of homes affected, costs, emissions or water. Downloadable CSV/JSON files retain source provenance. These supplemental consumer resources do not change the 86-record review corpus or the review PDF.

Sources added to consumer resources: U.S. EIA, Table 5a, 2024 Average Monthly Bill—Residential (released 2025-10-07); AWS, What is a Data Center? (undated); Apple Machine Learning Research, Introducing Apple’s On-Device and Server Foundation Models (2024-06-10, updated 2024-07-29). All accessed 2026-10-01.

## Richmond operator evidence

The prospective ledger now includes the supplied Iron Mountain Richmond campus brochure as operator evidence, with seven explicitly bounded quantities and no inferred operating water or emissions data. Its publication/filing date is unknown, so observation on 2026-10-01 is labeled separately. Source-copy SHA-256 identifies the supplied PDF; the matching-text public copy has a different file fingerprint. Conflicting operator schedules, missing certificate details and required environmental measurements remain visible. The original PDF is not redistributed in this repository.

[Structured Richmond evidence](site/richmond-brochure-evidence.json) supplements the 86-source review rather than changing the scholarly corpus. Undated records support explicit observedDate and optional sourceSha256; repeated observation alone does not duplicate a document.

## Visual impact explorer — 2 October 2026

The dashboard opens at `#impact`. Four views separate modeled electricity demand, company-reported water balances, hypothetical carbon scenarios and local project specifications. Selecting a state, campus or scenario updates the corresponding chart. The 50-state electricity model, 23-location Google water sample and smaller project ledger have separate coverage labels; their values are not combined into a national environmental score. Rounded water balances are explicitly identified. The full scenario calculator inherits assumptions selected in the visual explorer.

Project-watch cards now show a compact summary, with quantities, source limitations and review history in expandable details. This interface update does not expand the review corpus or establish measured health outcomes. Source citations remain beside each chart's methods.

Validation covered all 51 electricity geographies and both years, water rounding cases, carbon arithmetic and transfer of controls, collapsed/expanded filing cards, and mobile layouts. JavaScript syntax and research-data integrity checks passed. The underlying research cutoff remains 1 October 2026.

## Filing-language decoder

Project watch highlights a curated set of claim phrases in stored record titles, summaries and status text. Amber marks and expandable prompts ask for supporting measurements, accounting boundaries and certification details. The decoder does not scan full PDFs, infer the author’s intent, classify claims as false, or measure phrase prevalence. A switch removes highlights. Analyst limitations are excluded from matching, and input text is escaped before display. No filing records or review decisions are changed.

## Calder-inspired visual edition

The interface uses primary colors, strong typography and three generated mobile-style illustrations. Live HTML numbers sit inside the computer, electricity/carbon and dinosaur artwork; the pictures select their underlying impact panels. The water ring encodes consumption as a share of reported withdrawal, with rounded-balance notices. Decorative artwork has no quantitative scale. A cited EIA explainer separates dinosaur imagery from fossil-fuel origins and present-day wetland evidence. All scientific boundaries, source links, filing actions and claim highlights remain available.

Illustrations were generated with the built-in image tool; exact prompts are recorded in [asset provenance](design/calder-assets.json). No runtime image generation or animation is used.

## Cleaner power and community tours — 16 October 2026

The `#cleaner-power` tab compares regional air-quality benefits with local burdens for wind, solar and data centers using cleaner electricity. Seven cited publications include evidence type, geography and limits. Historical national modeled benefits are not facility-level measurements or credits against a new project's damages. The downloadable [supplemental study register](site/cleaner-power.json) does not expand the 86-source scoping-review corpus or change its PDF.

The homepage now defaults to `#nearby` on both GitHub Pages and the hosted app; explicit links to other tabs are preserved. A prominent header link opens the full research and health dashboard, and the Footprint brand returns home. The homepage prioritizes ZIP lookup and a ZIP-to-tour shortcut, with the full navigation available inside the dashboard.

The `#nearby` view is a lighter neighborhood explorer: original red/yellow/blue cloud-and-server artwork, numeric ZIP lookup, an Albuquerque example, compact place cards, and optional Look / Listen / Ask prompts. It reuses the sourced map and address data. Phase qualifications remain visible; sources and tour tools expand on demand. ZIP search starts at 25 miles and four cards, with smaller/larger radii and incremental browsing. A tour shortcut carries the entered ZIP into the timed tour finder; health, climate, research and state filings remain directly accessible. Project watch retains an entry link to the explorer. No observation prompt is presented as an exposure measurement.

The `#tours` tab opens with a numeric, leading-zero-safe ZIP search. It suggests five-minute walks, ten-minute walks and twenty-minute drives, including **two minutes to look at every stop by default** (adjustable from 0.5 to 15 minutes). A ZIP reference point shortlists up to eight nearby, public-address-listed sites within 2, 5, 10 or 25 miles. Duplicate/co-located records and identified office/contact-only records are excluded. The catalog is incomplete; an empty result does not establish that an area has no data centers. Suggestions begin at the first listed facility, not at a home or ZIP centroid; getting to that first stop is extra and stated on every suggestion.

The bounded itinerary search uses separate walking/driving route-time matrices, considers two to six stops and optional return to start, favors more stops within the total budget, then a start nearer the ZIP reference point, then shorter travel. Each proposed itinerary is checked with a full road/path route before being offered. Unreachable pairs remain unknown; there is no straight-line travel-time fallback. Looking time is charged at every stop, and a return leg does not add a second visit at the first stop. No-fit and service-unavailable states are separate; changing ZIP/settings cancels stale requests. ZIP lookup uses [Zippopotam.us](https://api.zippopotam.us/), including Puerto Rico lookup fallback. Only the entered ZIP is sent to that provider. Location permission is not requested.

Visitors can also paste addresses, arrange up to twelve places, or load the six Albuquerque / four downtown examples. Each suggestion loads into the numbered dashboard map with leg durations and cumulative arrival times. Personal tours retain driving/walking/cycling, stop reordering, field sheets, and optional browser-only notes. Google Maps receives selected addresses when directions are opened; notes are not submitted. Directions split at mobile waypoint limits. Routed times are estimates without live traffic, not measured trips. Sources and phase qualifications accompany selected stops; public addresses do not establish public access, current operation or pollution.

Manually entered address lookup uses the [US Census Geocoder](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html). Its documented JSONP runs in a sandboxed iframe without same-origin access. Six public example addresses have cached, sourced address-range coordinates in `site/tour-geocodes.json`; these are not verified building entrances. Other addresses are looked up only after the visitor clicks “Map & time my route.” Exact single matches are required; unmatched or ambiguous addresses do not receive invented coordinates. ZIP suggestions preserve sourced coordinates: the reviewed Albuquerque examples use cached Census matches; other address-listed sites use PNNL / IM3 representative map points joined to the address supplement. These points do not verify entrances. The method is disclosed in the interface and address/coordinate provenance is preserved in saved tours.

Routes use the separate foot, car and bike profiles of [FOSSGIS / OSRM](https://routing.openstreetmap.de/about.html), with OpenStreetMap attribution and a map-correction link. Network requests are serialized at least 1.1 seconds apart in each browser; results are cached for the page session. There is no polling or autocomplete. This community service has no availability guarantee: retain the visible error and external-directions fallback, and provision a hosted routing provider if traffic grows beyond its usage policy. Endpoint selection is centralized in `site/tour-route-map.js`. No paid API or secret is embedded. ZIPs go to Zippopotam.us; manually entered public addresses go to Census; coordinates go to FOSSGIS; notes remain in the browser. The first-stop journey, traffic, parking and accessibility verification are outside the estimate. Changing the itinerary aborts pending work and clears outdated results.

Check routing invariants with `node --test scripts/test-community-tours.cjs scripts/test-tour-routing.cjs scripts/test-tour-suggestions.cjs`.

## Dynamic buildout counts

The three headline counts now read a shared, dated JSON feed on the repository's public `main` branch. The public GitHub Pages dashboard and the hosted dashboard check it every five minutes while visible, on return to the tab, and when a visitor selects **Check latest counts**. They retain a validated local/cache observation during connection failures and show the observation date, failed checks, and data older than 48 hours. State selection survives a refresh; unavailable state counts remain unknown. Changes are compared only within the same defined source series, never against the original user-reported baseline.

`.github/workflows/update-counts.yml` collects daily at 14:23 UTC, and supports manual runs. It also runs when its collector changes. `scripts/counts/collect.cjs` reads USDataMap's publicly served directory layers, aggregates phases and state counts using the directory's ID/name deduplication, and saves aggregate observations plus a minimal named roster of construction and planned projects. Downloaded JavaScript is parsed as data, never evaluated. The embedded layers must reconcile with the source's static total; the current public layer can be newer than that cached total. Unknown statuses, missing layers, schema failures, and unavailable requests retain the last successful observation and publish a failed-check status. The companion roster contains names, operators, state codes and directory-reported phases; it does not copy directory descriptions or imply verified permitting status. The older Sites cloud task remains paused; these counts do not depend on it or the private `/api/counts` route.

The browser reads the raw public feed directly because GitHub-token commits do not trigger another Pages build. Thus routine data updates do not require deploying the application. GitHub schedules can be delayed or disabled by platform policy; visible timestamps remain the authority on freshness. Run `npm ci --prefix scripts/counts`, `npm test --prefix scripts/counts`, and `npm run update --prefix scripts/counts` to validate and collect manually. Source: [USDataMap](https://usdatamap.com/); directory records are not a verified national census, physical opening count, or environmental-impact measure.

## Voting and ballot measures — 18 October 2026

The `#vote` destination under Act combines a dated Ballotpedia national snapshot (38 local measures in eight states, published 21 September 2026) with four separately sourced examples: Boulder City, Augusta Township, Monterey Park and Port Washington. State/territory and election-timing filters include all 50 states, DC and Puerto Rico. Missing coverage is unknown, not zero; the examples are not the full national register or a personalized ballot.

Equal-weight yes/no explanations separate land-use authorization, prohibition, rezoning and future voter approval. Official documents are linked on each card. Past-election outcomes retain their source status, including the distinction between an election-night report and a certified canvass. Dates classify records automatically but do not infer results or registration deadlines. Official election-office and Vote.gov links provide local sample ballots and participation rules; no address or voting-choice collection is added. Ballot research remains separate from the scholarly review corpus.

The maintained source file is `site/ballot-measures.json`, mirrored into both application editions. Updating a record requires checking current official language and status, retaining source publication dates, and linking an outcome source before adding a result. There is no automatic ballot/results feed. Validate with `node --test scripts/test-ballot-measures.cjs` and `python3 scripts/validate.py`.

Public-comment guide (18 October 2026): `#citizen` now offers a four-step,
mobile-friendly builder with 16 concern choices and separate letters for air
permitting, local planning, county fiscal questions, community health, utility
cases and legislators. It supports existing-records requests and a generic
other-community template. Personal text remains in tab memory; download,
copy and print are user-controlled, and the tool never submits comments.

The supplied `Complete-Package-T073-50413-00077_v27.pdf` (87 pages) and the
11-page `Policy-Kit-with-Resident-Guide_v1.pdf` informed the question design;
they are not redistributed. The latter combines the seven-page prototype
and four-page resident guide. Project-specific statements link to
the IDEM draft rather than treating the supplied review as an agency finding.
Testing rotates to previously untested engines; unlimited genuine emergency
hours do not erase the draft's separate annual NOx/VOC/CO caps. Screening
plumes and reported contract totals are not inserted as established facts.
The prototype's scoring totals are not used as validated health or compliance
scores. The federal maintenance/readiness provision allows 100 hours/year,
subject to specified exceptions; the allowed 50 non-emergency hours are
included, not additional. The draft conditions are distinct from proposed
safeguards, actual operating measurements and evidence still to be found.

The Act wizard includes a seven-document research checklist, evidence labels,
questions about test scheduling and open operating logs, and a follow-up
guide for the final response and decision. A separate spoken-comment builder
uses up to three selected concerns for the current office, preserving the
resident's chosen position. It includes editable text, word count, an estimated
duration at 130 words/minute, copy/download/print and explicit replacement of
existing drafts. Three minutes is only a practice target; the verified Jasper
notice does not establish a per-speaker limit. Records requests have no oral
testimony option. Letter edits are not automatically summarized into speech.

Participation checked against IDEM's original notice, extension and hearing
notice on 18 October 2026: written comments end 16 November 2026 (no closing
clock time stated); virtual hearing 10 November at 6 PM Central. Hearing chat
is not a comment channel. These dates also update the public-events list and
Jasper case JSON. They are dated checks, not a live regulatory feed.

Verification: `node --test scripts/test-citizen.cjs` checks routing, separation
of generic templates from Indiana evidence, date boundaries, records-request
scope, oral outline routing, timing estimates and literal preservation of user
text. `python3 scripts/validate.py`
checks the existing evidence corpus. Other jurisdictions require residents to
verify their own notice and recipient; no nationwide legal coverage is implied.

To run the DOM interaction checks, install the temporary test dependency with
`npm install --prefix work/citizen-test --no-package-lock --no-audit --no-fund jsdom`,
then run `node --test scripts/test-citizen-dom.cjs`. These check per-letter edits,
explicit regeneration, records mode, recipient entry, literal text handling,
per-office spoken drafts and clearing. Research checkboxes reset when switching
projects. All replacement decisions use on-page controls instead of native
confirmation dialogs. Browser access to the local preview is blocked by the
browser URL policy; published-page checks are recorded separately.

Solar clarification (18 October 2026): the Cleaner power view compares a
12-hour supply gap at 100 MW and 50 MW of total facility demand (1,200 and
600 MWh delivered, respectively). It distinguishes storage energy from
discharge power, includes cooling in the load boundary, and identifies
losses, reserves, recharge and multi-day reliability as additional design
requirements. DOE storage guidance and an explicitly labeled Google
operator report support the explanation. The Act wizard includes a proposed
policy request for tested storage and workload-flexibility plans; it does not
assert an existing legal mandate or universal curtailment percentage.

Act project picker (18 October 2026): the Which project selector loads
`data-center-projects.json`, built from the same validated and deduplicated
records as the headline counts. Its dated snapshot contains 239 reported
construction and 82 reported planned records, across 45 states. State, phase
and name/operator filters preserve the current selection. Choosing a record
fills its name and state into the generic letter flow; recipients and docket
numbers are cleared and must be verified. Only the separately selected
Jasper guide inserts the reviewed Indiana facts. Edited letters are retained
until the user explicitly replaces them. Refreshes never overwrite form text.

The collector and daily workflow now write both count and project feeds.
The picker checks the public main-branch project feed every five minutes
while visible and on request, retaining its packaged snapshot if unavailable.
These workflow changes are on v2-10.18.2026; scheduled roster publication
requires integration into main. No merge to main is performed automatically.
Tests: `node --test scripts/counts/test.cjs scripts/test-citizen-projects.cjs
scripts/test-citizen.cjs scripts/test-citizen-dom.cjs`.

Hearing phone access (18 October 2026): the Jasper Act guide displays the full
+1 (317) 552-1674 dial-in number separately from conference ID 141 723 194#.
Tap-to-call opens only the base telephone number; callers enter the ID at the
prompt. Copy controls provide the ID or full date/time/source instructions,
with selectable-text fallback when clipboard permission is unavailable. The
6 PM CST / 7 PM EST time and local-number URL are from the November 10 IDEM
hearing notice (including its PDF link annotation). No test phone call was
placed. These event-specific details are hidden for other project selections.

General hearing-access cards: every event marked `isHearing` in
`site/public-events.js` uses a common participation template. A verified
`access` record holds the complete international phone number, conference ID
(or explicitly confirmed no-ID requirement), source URL, verification date,
local-number and online links, and speaking instructions. Event dates carry
an IANA time zone and an offset-bearing start time. Organizer contact numbers
are not promoted to dial-in numbers. Missing phone access and missing IDs
remain labeled unverified; past events display archived numbers without call
buttons. The Jasper notice is one populated example, not a universal number.

Validate with `node --test scripts/test-hearing-access.cjs`. These checks
cover another hearing, missing access, unsafe telephone values, archived
events, and separation of organizer contacts from conference access.

## Shared visual language

`site/observatory-art.css` is the final visual-system stylesheet; the former `soft-surfaces.css` is no longer loaded. Keep new views consistent with the original balancing-act identity: warm paper, ink outlines, rounded comic panels, red/yellow/blue suspended shapes, halftone shading, and crisp offset shadows. `site/balancing-act.svg` is original decorative artwork, not a quantitative graphic.

Use dots on illustrations or margins, leaving text and inputs on solid surfaces. Use color sparingly in dense research views. Preserve evidence-status colors and scientific chart scales; decorative shapes must not imply measured severity. Keep touch controls at least 44px, retain visible keyboard focus, honor reduced motion, and check narrow layouts. The six-toed footprint remains the brand and favicon.
