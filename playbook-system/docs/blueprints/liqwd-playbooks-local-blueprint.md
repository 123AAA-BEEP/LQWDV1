# LIQWD Playbook System — Local Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect the 11 Search Atlas Local playbooks — the Google Business Profile (GBP) layer: profile optimization, reviews, posting, photos, hours, service-area businesses, geo landing pages, and Map Pack tracking — and adapt them for LIQWD. Companion to the five prior blueprints; spec standard v1.1 applies.

**Why this set matters:** realtors ARE local businesses. "Best realtor in Port Credit" resolves in the Map Pack before it resolves anywhere else, and a realtor's GBP is usually their most neglected high-leverage asset. This makes the Local set the **most directly sellable agent-tier product in the entire library** — "LIQWD runs your Google presence" (profile, reviews, weekly posts, photos, hours) bundles naturally with managed campaigns and produces visible weekly proof-of-work. One playbook here (Generate Landing Pages) additionally lands squarely on the resale module's neighbourhood-page strategy.

---

## Part 1 — New Mechanics Extracted (Additions to the Library)

- **Trigger-condition declarations** (Weekly GBP Posting): the card explicitly states when the playbook should and should NOT fire ("do NOT trigger when user asks for a single post"). Playbooks in an agentic router need declared activation boundaries — adopt as a spec-standard card field.
- **Escalation taxonomy** (Burn Down Location Tasks): triage classifies every item APPROVE / IGNORE / **ESCALATE** with a rationale, and sensitive categories (legal, refund, complaint) auto-escalate to a human. Third disposition beyond approve/reject — required anywhere the machine touches customer-facing communication.
- **Full-draft inspection rule** (same): the reviewer step must read the entire draft, never triage from subject lines or summaries. Quality control on the *reviewing* behavior itself.
- **Risky-field isolation** (Correct Service & Category Drift): primary-category edits are evaluated and flagged *separately* because they carry suspension risk; safe fields (services, attributes, secondary categories) stage normally. Field-level risk stratification, not change-level.
- **Edit pacing / suspension defense** (SAB Growth): changes to a platform profile are deliberately paced to avoid re-verification triggers, suggested edits are monitored, and proof documents archived. Platform-trust management as an explicit ongoing phase.
- **Explicit ambiguity confirmation** (Set Holiday & Special Hours): regionally-mapped holidays that can't be resolved confidently are surfaced to the user as unconfirmed rather than guessed — with the unconfirmed list carried into the final report.
- **Asset-to-location matching integrity** (Top Up Location Photos; Weekly Posting): media additions must match the specific location/service — no generic or mismatched photo stuffing, no image repeats within a 4-week window. Media hygiene as enforced rules.
- **Demand-driven geo selection + coverage diff** (Generate Landing Pages): target cities/areas chosen by measured local search demand; existing sitemap audited first so covered geos are skipped (cannibalization prevention); gaps become a backlog; hub-and-child architecture with defined internal links; **non-boilerplate scaffolds** with local landmarks and trust signals per page.
- **Review-velocity benchmarking** (SAB Growth): review acquisition targets set against the top competitor's monthly velocity — reputation goals grounded in the actual local race, not arbitrary numbers.
- **Per-run location caps everywhere** (5–25 depending on tool): the same blast-radius discipline, applied to multi-location operations.

---

## Part 2 — Playbook-by-Playbook Review & Triage

Tiering: these tools run on *realtor* GBP profiles (LIQWD's own GBP footprint is minor), so nearly everything is **Admin-operated as a managed service on agent accounts**, with realtor approval taps — the Phase-2 packaging from the Smart Ads blueprint applies verbatim.

**1 · Improve Map Rankings & Calls → G2.** DAG: Brand Vault sync → GBP baseline audit → top-3–5 map-competitor benchmark → category/keyword audit + content & media check + reputation & Q&A audit → high-impact field mapping + attribute/media plan → before/after review gate → field-level sync applied individually to live GBP → live verification → report. The comprehensive profile optimizer, with the "Executed by: Local SEO Expert (GBP Specialist)" persona.

**2 · Set Holiday & Special Hours → G3.** 60-day window default, ≤10 locations/run, timezone/region-aware, regional holiday mapping, explicit ambiguity confirmation, apply + audit report with unconfirmed dates listed. Textbook seasonal hygiene.

**3 · Correct Service & Category Drift → G2.** ≤5 locations/run → fetch live state + valid Google category IDs → cross-check against Vault as source of truth → discrepancy identification → primary-category risk isolation → stage safe edits locally → audit report with deployment warnings. The drift-correction half of the profile optimizer.

**4 · Burn Down Location Tasks → G6.** Location confirmation → queue refresh → ≤25 tasks across review replies, posts, Q&A, updates → full-draft inspection → APPROVE/IGNORE/ESCALATE with rationale (legal/refund/complaint auto-escalate) → triage table + aggregate stats. The GBP-surface sibling of O4's queue-triage pattern; kept separate because the escalation taxonomy and platform surface differ.

**5 · SAB Growth → G2 (SAB mode) + G1/G4 elements.** The most sophisticated playbook in the set: SAB-vs-hybrid policy check with safe-edit rules, competitive benchmarking, ≤20 service areas compliance, monthly copy/media refresh, citation cleanup with address suppression, 10–15 unique city pages, review-velocity targets, multi-centroid rank tracking, and suspension defense with paced edits. LIQWD relevance: many realtors operate office-based-but-serve-everywhere profiles — G2 gets an SAB mode carrying the policy checks, edit pacing, and citation-suppression discipline; the multi-centroid tracking folds into G1; review velocity folds into G4.

**6 · Generate Landing Pages → G7.** DAG: fetch GBP + NAP → confirm services → evaluate per-geo search demand → assign hub/child tiers → sitemap coverage diff (skip covered geos) → gap backlog → link structure + schema plan → non-boilerplate scaffolds with local proof → generate via Website Studio, hubs first → page-tree summary. *This is the geo-expansion planner the resale module's Mississauga-first neighbourhood strategy needs* — demand-driven neighbourhood selection, hub-and-spoke architecture, cannibalization-safe coverage diffing, and thin-content-resistant briefs. G7 plans; generation executes through the existing page builders under the thin-content gate; E2 remains the post-publish check.

**7 · Distribute Blog Content to GBP & Social → G5.** GBP + social account verification → URL collection + brand-tone/topic extraction → optimized GBP snippet drafts → multi-channel publish. Merges into the posting engine; connects directly to the FB/IG API architecture already planned for social automation.

**8 · Respond to GBP Reviews → G4.** Fetch → segment (unresponded; new 5-star) → star-tailored professional drafts → approval gate on the initial bulk run → publish → republish 5-star reviews as GBP posts. *Adaptation is where LIQWD must be stricter than the source:* the source auto-responds to ALL reviews after initial approval. LIQWD's G4 auto-publishes only 4–5-star responses (after a supervised initial period); **≤3-star responses are always human-approved** — a bad automated reply to an angry client is a reputation event; and a privacy/RECO lint runs on every draft (never confirm a reviewer was a client or reveal transaction details; brokerage identification rules apply to promotional posts).

**9 · Analyze Visibility Grid → G1.** Validate context → select 5 revenue-driving keywords → 5-mile geo-grid radius + density → weekly scan schedule → approval gate → deploy + baseline verification. Heat-map Map Pack tracking; absorbs SAB Growth's multi-centroid scoring for multi-area agents.

**10 · Weekly GBP Posting → G5.** Media library audit + Vault assets → image validation (unique per service, no repeats in 4 weeks, sufficiency check, AI generation only if approved) → rotation framework through all services → post copy + CTA → 4–8-week scheduled calendar → verify → deploy. For realtors, "services" become offers and neighbourhoods (valuation, buyer consult, neighbourhood spotlights, new listings) rotating on cadence, with Agent Brand media first and flavour-consistent AI images as approved fallback.

**11 · Improve Map Rankings & Calls** — listed once; see #1. (The set's list also cross-files the Content-set distribution playbook, handled in #7.)

---

## Part 3 — The LIQWD Local Suite (7 Tools)

- **G1 · Local — Map Visibility Grid.** Per-realtor 5-keyword geo-grid tracking, weekly scans, multi-centroid scoring for multi-area agents, baseline + trend reporting. The measurement backbone of the GBP managed service — and the before/after proof in every realtor digest.
- **G2 · Local — GBP Profile Optimizer.** Merge of #1 + #3 + SAB Growth's profile machinery. Baseline audit → competitor benchmark → Vault-grounded category/service/attribute alignment with risky-field isolation → attribute & media plan → before/after review gate → field-level staged sync with edit pacing and suspension defense. SAB mode for serve-everywhere agents (policy checks, ≤20 areas, citation/address suppression).
- **G3 · Local — Hours & Photo Housekeeping.** The recurring hygiene pair: holiday/special hours (regional mapping, ambiguity confirmation, caps) + photo top-up (thresholds, thin-location flagging, Agent-Brand-matched additions only, status matrix). Scheduled quarterly/seasonally; near-zero realtor effort, visible care.
- **G4 · Local — Reviews Engine.** Star-segmented response drafting in the agent's voice → auto-publish 4–5-star after supervised ramp; ≤3-star always human-gated → privacy/RECO lint on every draft → 5-star amplification as GBP posts → review-velocity tracking vs top local competitor. The highest-emotion surface in the whole program; the extra gates are the product.
- **G5 · Local — GBP Posting Engine.** Rotation framework across the realtor's offers and neighbourhoods → media-library-first with validated uniqueness → 4–8-week calendars → GBP publish + cross-post to FB/IG via the social layer → declared trigger boundaries (cadence tool, not single-post tool). Weekly visible output — the heartbeat of the managed service.
- **G6 · Local — GBP Task Triage.** ≤25 items/run across replies, posts, Q&A, and updates → full-draft inspection → APPROVE/IGNORE/ESCALATE with rationale, sensitive issues auto-escalated → triage table + stats. Keeps the managed service's queue at zero without ever auto-shipping a sensitive reply.
- **G7 · Local — Geo Page Planner.** Demand-driven neighbourhood/city selection → hub-and-child architecture → sitemap coverage diff and gap backlog → link/schema plan → non-boilerplate local briefs → hands off to the page builders (thin-content gate unchanged) → page-tree summary. Serves two masters: the resale site's neighbourhood expansion and, later, realtor local-page bundles.

---

## Part 4 — Foundations & Fit

**Two new foundation tickets:**
1. **Google Business Profile API access + account model.** GBP API has its own application/approval process (another lead-time item — file alongside the ads APIs). Account model mirrors the ads decision: realtors grant LIQWD manager access to their GBP (standard agency pattern), giving clean per-location permissions and revocability. All writes flow through the change ledger and spend-safety service's sibling: a *profile-change ledger* with per-location caps and pacing enforcement (suspension defense implemented centrally, not per-prompt).
2. **Geo-grid rank scanning.** G1 needs Map Pack position sampling across a coordinate grid — build on a third-party grid-scan API initially (evaluate options at build time) with results landing in the metrics warehouse; revisit building in-house only if volume justifies it.

**Sequencing within the set:** G7 first (it's really a resale-module tool and needs no GBP API — only search-demand data you already have access to) → GBP API application immediately (lead time) → G1 + G2 as the managed-service opening move (measure, then fix the profile) → G4 + G5 (the visible weekly value) → G3 + G6 (steady-state hygiene).

**Cross-suite wiring:** G7 → page builders + E2 · G1 metrics → realtor digest + E5-family reporting · G4/G5 drafts → approval queue → O4 triage pattern · G5 cross-posting → the FB/IG social layer · Agent Brand supplies voice, media, and identity everywhere · V-suite later adds "what AI says about you" beside G1's "where you rank on the map."

**Agent-tier packaging note:** this set plus managed campaigns forms the complete realtor bundle — *your ads, your pages, your Google presence, one monthly story.* G1's heat map and G4/G5's visible activity are the retention engine; nothing else in the library produces proof-of-work a realtor can see this directly.

---

*Dissected: Website Studio (3→4), Smart Ads (24→13), Explorer (7→6), AI Visibility (6→3), OTTO (6→4), Local (11→7). Running total: 57 source playbooks → 37 LIQWD tools. Remaining sets: Content, Authority, Atlas.*
