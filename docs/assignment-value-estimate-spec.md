# Frame-Out — Assignment Value Estimate (AVE) v1 + GTA Assignment Index + Price-Event Logging

**Status: FRAME-OUT ONLY. Do not implement until founder approves.**
Date: 2026-07-28. Companions: `docs/growth-ideas-assessment.md` (incl. no-comps/licensing
addendum), `docs/assignment-desk-spec.md`, `docs/tools-calculators-spec.md`.

## Positioning
The one tool nobody in the GTA offers: "what is your pre-con contract worth today vs. what you
paid." Listing marketplaces exist (CondoNow, Assign Circle, Kijiji…); an algorithmic estimate
does not. It is simultaneously (a) a seller-side lead magnet, (b) the supply seeder for the
Assignment Desk (0 listings today), (c) the public face of a proprietary dataset competitors
can't copy quickly. v1 uses **no MLS data** (see licensing addendum): our own pre-con dataset +
public aggregates.

---

## 1. AVE v1 — the tool

- **URL:** `/tools/assignment-value-estimate` (tools-hub pattern) — H1 "What is your
  pre-construction assignment worth?"
- **Audience:** assignor-buyers (public) + agents running comps for clients.

### Inputs
| Field | Notes |
|---|---|
| Project | typeahead over our 2,008 projects; manual fallback (name/city/year) |
| Unit size (sqft) | required |
| Original purchase price | required (→ original PPSF) |
| Purchase year | select |
| Floor band / exposure | optional, small capped adjustments |
| Parking / locker included | optional flags |
| Expected occupancy date | select (liquidity factor) |

### v1 methodology (no MLS strings)
Estimate = original contract vs. today's replacement cost, discounted for the assignment market:
1. **Current-launch PPSF band** for comparable active projects (same city/segment/type) from our
   own `projects` pricing data — "what the same market charges today."
2. **Incentive adjustment** — current incentive prevalence in that city/segment (our incentives
   data) treated as an effective price reduction on the comparison band.
3. **Assignment liquidity discount** — a documented, fixed assumption band (assignments trade
   below equivalent new/resale: motivated sellers, deposit size, financing friction). Published
   on the methodology page; refined as Desk data accrues.
4. **Crude adjustments** (optional inputs): floor band, exposure, parking — small, capped, shown
   transparently.
5. **Sanity anchors:** public aggregates (TRREB Market Watch condo averages, CMHC) bound the
   band; we never display anchor source data at listing level.
6. **Flywheel:** as `assignment_listings` fills (fields `original_purchase_price`,
   `assignment_price` already exist — migration 0072), real asking/closed comps progressively
   replace assumptions. Their weight scales with count per city/segment.

### Output & gating
- **Public (no login):** a RANGE (e.g. "$690k–$760k") + direction vs. original ("≈ +9% to +19%")
  + confidence label (High/Med/Low from comp density) + top 3 drivers in plain language.
- **Behind free signup:** precise midpoint, driver breakdown, comparable active-project pricing
  context, emailed PDF. (Registration driver; also the compliance-friendlier posture.)
- **CTAs:** "List on the Assignment Desk — free" (primary, supply flywheel) · "Talk to a
  verified pre-con agent" (secondary). No lead promises to agents.

### Compliance guardrails
- "Market information estimate — **not an appraisal** or opinion of value; consult a designated
  appraiser or your realtor" on every surface, PDF included.
- **Never** publish named-project "underwater/overpriced" labels or league tables (TRESA
  false-or-misleading exposure + defamation risk + developer relations). Per-project value
  commentary only ever inside the verified-realtor gate, if at all.
- Ranges in public, point estimates only behind signup; methodology page public (trust + PR).
- PIPEDA/CASL on the signup + PDF email path.

### Risks
- **HouseSigma fast-follow** (they have the AVM muscle + 1M GTA visitors). Moat = assignment
  focus, the Desk supply loop, broker-only data, and the event-log dataset — not the algorithm.
- **Accuracy criticism** → ranges + confidence labels + public methodology; log every estimate
  (inputs/outputs) so accuracy can be back-tested as real comps accrue.

### Market-practice check (condos.ca, added 2026-07-28)
condos.ca — itself a TRREB member brokerage — shows **building-level aggregates publicly**
(avg $/sqft over N recent sales, historical PSF charts, ranks) while gating **unit-level
sold/leased records behind a free VOW login**. This is the two-layer posture available to any
member brokerage and confirms phase 2 for us: once LIQWD's data flows under a member
brokerage's VOW/IDX agreements, our building-level PSF aggregates can be public (matching
market practice), with unit-level comps behind the free login. It does NOT make condos.ca a
data source: scraping or repurposing their computed stats is off-limits (their ToS + the
compilation is theirs, underlying rights are TRREB's, and a third party cannot sublicense
what we'd be taking). Legitimate uses only: replicate their access under our own brokerage
agreements, and manual analyst calibration of our assumption constants against public stats
(cite TRREB Market Watch / CMHC in published material, not competitor pages).

## 2. GTA Assignment Index (quarterly)

- **URL:** `/reports/gta-assignment-index`, following the live `/reports/gta-pre-construction`
  pattern (server-computed figures + Dataset JSON-LD for Google Dataset Search).
- **v1 sections (own data only, honest about coverage):** launch-price PPSF by city/segment
  (our projects data) · incentive prevalence % and types · assignment-market narrative +
  liquidity-assumption band · methodology + citable one-liners.
- **As data accrues:** median asking PPSF on Desk listings, ask-vs-original spreads, quarterly
  deltas from `price_snapshots`.
- **Distribution:** quarterly cadence; a PDF/press summary + 2–3 pre-written citable stats for
  journalists/newsletters; every AVE result page links the current Index (internal-link loop).
- **Naming:** "LIQWD GTA Assignment Index" — brand attaches to the citation.

## 3. Price & incentive event logging (start immediately — answers the visibility question)

**Proposed tables** (names indicative):
- `price_snapshots` — project_id, floorplan_id?, price fields (band min/max, $/sqft when
  known), source (`admin_edit` / `email_intake` / `discovery` / `update_request` / `manual`),
  source_ref (doc/email id), captured_at, review_status (`raw` / `reviewed` / `rejected`).
- `incentive_events` — project_id, description, kind (deposit structure / credit / rebate /
  fee cap…), starts/ends?, same source + review columns.

**Cheapest v1 feeds (no new pipelines):** trigger a snapshot whenever admin project-editor
saves change price fields; log an event on incentive edits; tag rows created off email-intake
and update-request approvals. Backfill from `email_intake_log` (129 rows) where parseable.

**Visibility — recommendation: three rings.**
1. **Raw = admin-only, from day one.** Unreviewed extractions are wrong often enough that
   showing them would burn trust; admin queue approves/rejects (mirrors existing
   submissions/updates review pattern).
2. **Curated = verified-realtor view, soon.** A per-project "Price & Incentive History"
   timeline (broker-gated like commissions) once a project has ≥2 reviewed events. This is the
   product payoff AND the contribution flywheel — "forward your price sheets, see every
   project's history" — and slots into the give-one-get-all offer. Not at launch of logging;
   ship when review flow works and a few dozen projects have history.
3. **Public = aggregates only,** via the Index (city/segment stats). Never per-project price-cut
   callouts publicly — developer relations (the Deal Desk side of the business) + accuracy risk.

## 4. Sequencing within this frame
1. Logging tables + admin review queue (invisible, starts the moat clock).
2. AVE v1 tool + methodology page (public range / gated midpoint).
3. First Index issue (own-data sections), timed with an Assignment Desk push.
4. Realtor-facing history timeline once reviewed data covers enough projects.

## Open decisions (founder)
1. Liquidity-discount band v1 (proposal: publish a conservative band and label it an
   assumption; refine quarterly).
2. Signup wall depth: midpoint-only behind login (recommended) vs range also gated.
3. Index cadence at launch: quarterly (recommended) vs monthly-lite.
4. Whether AVE results may surface inside Assignment Desk listing creation (prefill +
   "estimated by LIQWD" badge) at v1 or later.
5. Estimate logging retention/consent copy (we store submitted unit details to back-test).
