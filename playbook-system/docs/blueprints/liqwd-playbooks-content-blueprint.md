# LIQWD Playbook System — Content Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect the 15 Search Atlas Content playbooks — the article/editorial production system: topical mapping, batch drafting, grading, decay recovery, internal linking, and the AI-visibility flagship content types — and adapt them for LIQWD. This set fills the one gap the previous seven left open: a governed production line for the blog/resources layer of liqwd.com, the resale site, and eventually agent content. Companion to the prior blueprints; spec standard v1.1 (including Experience Modes) applies.

---

## Part 1 — New Mechanics Extracted (Additions to the Library)

- **Node-state topical network** (Domain Knowledge Network Expansion): the topical map is a *stateful graph* — nodes are pending/failed/complete, with metadata completeness tracked per node — and the playbook's job is to fill it in rather than let it stall half-built. Content strategy as a data structure, not a spreadsheet.
- **Metadata-before-generation gate** (same): nodes get their keywords/category/slug/description completed *before* article generation triggers — max 3 keywords, batched ≤50 metadata updates, generation only for metadata-complete nodes, async status polled in batches of 15.
- **Voice-profile precondition** (Run the Production Line): drafting refuses to start unless the Brand Vault contains a voice profile. Brand alignment as a hard precondition, not a hope.
- **Grade-revise loop with iteration caps** (Production Line; Remediate): every draft runs through an objective content grader; below-target drafts get revised — capped at 2 rounds. Quality enforced by loop, cost controlled by cap.
- **Core-argument one-line summaries** (Production Line): the review packet includes a single line stating what each article *argues*. A tiny mechanic that makes human review dramatically faster — adopt everywhere.
- **Dual-window decay detection + false-decliner exclusion** (Refresh Decaying Pages): two user-chosen comparison windows (explicitly *no defaulting*), delta calculation, then exclusion of false decliners — seasonality, cannibalized queries, deprecated pages — before any remediation. Plus a site-wide flag when drops indicate broader causes (routes to the diagnostics layer, not per-page fixes).
- **Remediation-path routing by page origin** (same): declining pages route to regeerate-and-regrade if the system authored them, or to staged on-page edits (the O1 path) if not. The page's provenance decides the fix channel.
- **Authority-realistic topic selection** (Launch New-Site SEO Content): keyword difficulty thresholds calibrated to the domain's *current* authority — young domains only chase what they can realistically win soon. The content-side twin of the Authority set's new-domain conservatism.
- **Numbered-citation discipline** (AI-Optimized About Page): every factual claim maps to a specific numbered source; a dedicated verification node confirms the final text's claims match the final source list; anything unverifiable is **labeled TBD rather than written around**. The strongest grounding pattern in the entire source library.
- **Neutral-tone enforcement as a pipeline stage** (About Page; Listicle; Head-to-Head): hype, speculation, and first-person marketing voice are removed by a named editorial node — with the Listicle adding "zero hype or emojis, clean tables" as mechanical rules.
- **Substantiated-comparison rule** (Head-to-Head; Listicle): comparison tables may contain only substantiated strengths; competitor profiles are written neutrally and objectively; evaluation criteria are defined *before* drafting and applied consistently to all entries.
- **Stop-condition checks** (Listicle): an explicit halt node if no project is selected or the primary brand is unconfirmed — the run stops rather than assumes.
- **OAuth/token preflight + approval-mode confirmation** (Fill the Evergreen Cadence): social tokens validated before scheduling (preventing silent publish-time failures), and the playbook checks whether the account is in auto-publish vs manual-review mode — *prompting the user if auto-publish is active* before proceeding.
- **Evergreen-only filter** (same): candidate content excludes news, live promotions, and time-sensitive claims. Cadence-filling content must be safe to publish any day.
- **Auto-retry for long-running tasks** (Automate SEO Publishing; Topic Clusters): pipeline robustness as a declared execution guardrail.
- **Anti-reciprocal link hygiene** (Build Internal Links): 3–5 contextual links max, natural anchors, skip already-healthy articles, prevent reciprocal/self-referential loops, full link audit report.

---

## Part 2 — Playbook-by-Playbook Review & Triage

**1 · Domain Knowledge Network Expansion → C1.** Pre-flight (DKN metrics, Vault verify, valid categories) → find thin/failed nodes → rank by relevance to core services → batch metadata enrichment → capped generation (≤10 nodes) → async status → before/after report. *LIQWD translation:* the topical map becomes a first-class Supabase structure — a network of topics tied to neighbourhoods, projects, buyer questions, and market themes, with node states — and C1 is its caretaker.

**2 · Fill the Evergreen Cadence → absorbed into R3/G5 (cross-listed).** The social-calendar gap-filler: token preflight, approval-mode confirmation, 30-day slot math, Vault-sourced evergreen topics, dated-material filter, platform char limits, ≤10 posts/run. The Realtor Studio Social Engine and GBP Posting Engine already own this surface; they inherit these mechanics verbatim (especially the OAuth preflight and the auto-publish confirmation prompt).

**3 · Build Internal Links → C4.** Target selection (≤10) → context analysis → related-content identification → 3–5 natural contextual links → anti-reciprocal/skip-healthy audit → link report. Complements O1's internal-link *mapping* with article-level link *weaving*; scheduled after every production batch.

**4 · Remediate Low-Grade Articles → C3.** Threshold prompt → ≤5 articles/run → grader → rank by score-gap × traffic → targeted fixes only (structure, body depth, keyword coverage — explicitly *no full rewrites*) → re-grade, ≤2 rounds → impact report. Surgical repair, blast-radius capped.

**5 · Run the Production Line → C2.** Project + **voice-profile precondition** → topical map check (retrieve or generate) → dedupe against existing articles, select ≤3 high-authority gap topics → draft with review structure → grade & revise ≤2 rounds → summary table + one-line core-argument per article. The weekly heartbeat of the content system, with the 3-article cap as its defining discipline.

**6 · Refresh Decaying Pages → C3.** Two comparison windows (asked, never defaulted) → GSC deltas → lost-query analysis → qualify ≤5 pages with meaningful non-seasonal drops → exclude false decliners → route: regenerate-and-regrade (system-authored) vs staged O1 edits (everything else) → impact table + site-wide flag to the E-suite when the pattern is bigger than pages. Merges with #4 into one quality-and-decay loop: same grader, same caps, two entry doors (low grade; lost traffic).

**7 · Distribute Blog Content to GBP & Social → cross-listed (Local G5).** Already dissected; no second build.

**8 · Grow Organic Traffic → C2 (intake mode).** Vault retrieval → keyword/intent/competitor-gap analysis → clarify gaps (timeline, priorities, constraints) → delegate to the content engine → SEO optimization → quality audit. The "Senior SEO Copywriter" generic entry point becomes C2's on-demand intake mode (vs its scheduled batch mode) — one engine, two doors.

**9 · Create AI-Optimized About Page → C5.** Crawl + external references → extract verifiable claims → cross-reference → numbered citations → SEO metadata + core sections → **label unknowns TBD** → neutral-tone enforcement → citation-integrity verification → AI-retrieval structuring. The grounding pattern LIQWD's whole Vault architecture was built to feed — for LIQWD this generates entity/About pages for the platform *and per-property entity pages*, each claim tied to a Vault source.

**10 · Create Industry-Leader Content → C5.** Vault audit (awards, certs, press, leadership) → ≤3 clarification questions → strategy + 13-section editorial outline → explicit approvals on plan/Vault/outline → delegated generation with editorial rules → SEO & AI optimization → handoff with metadata. Award-style editorial, balanced journalistic framing.

**11 · Create Industry-Leader Listicle → C5.** Stop-condition check → consistent evaluation criteria defined up front → mandatory structure (title/intro/rankings/comparison table/verdict) → primary brand #1 with objective defensible strengths → neutral competitor profiles → zero-hype editorial rules → quality verification (structure, current-date usage, consistent evaluation) → export. *The ethically-loaded one — see Part 3's honesty rules.*

**12 · Create Head-to-Head Comparison → C5.** Competitor identification by relevance → ≤3 clarifications → evaluation criteria (features, pricing, etc.) → differentiators → structured longform + side-by-side table of substantiated strengths → neutral-tone rules → quality verification → deliverables. "Brand vs Brand" high-intent capture.

**13 · Build Topic Clusters → C1 + C2.** Pillar topic → subtopics → pillar draft → cluster articles → link architecture distributing authority to the pillar → categorize → publish. The planning half is C1's network structure (hub-and-spoke is just a subgraph shape); the execution half is C2 batches; the linking half is C4. No separate tool needed.

**14 · Automate SEO Content Publishing → REJECTED as designed; mechanics salvaged.** "Continuously generates and publishes... without manual planning or approvals" — end-to-end unsupervised publishing is a direct contradiction of LIQWD's architecture, where every public artifact passes the approval queue and the Vault-grounding lint. The answer to approval fatigue is O4's triage pre-pass making the gate cheap, not removing the gate. Salvvaged: scheduled cadence management and auto-retry robustness, both absorbed into C2's scheduling layer.

**15 · Launch New-Site SEO Content → C2 (new-site mode).** Domain authority analysis → audience definition → **realistic ranking-difficulty thresholds** → high-intent low-competition keyword research → viable-topic filter → foundational drafts → on-page optimization → organized storage. Becomes a C2 mode flag: young properties (new microsites, the resale site early on) get the authority-calibrated topic ceiling automatically.

---

## Part 3 — The LIQWD Content Suite (5 Tools)

- **C1 · Content — Topical Network Manager.** The stateful topical map: nodes (topics tied to neighbourhoods, projects, buyer questions, market themes) with states and metadata completeness; ranking by business relevance; metadata-before-generation enrichment; capped fill-in batches routed to C2; before/after network reporting. Hub-and-spoke clusters are a native subgraph shape. Feeds and consumes G7 (geo planning) and E2 (growth typology).
- **C2 · Content — Production Line.** The weekly engine: voice-profile precondition → topical-network pull → dedupe → ≤3 articles/batch → grade-revise ≤2 rounds → core-argument summaries → approval queue → publish + O3 indexing. Three doors: **scheduled batch** (weekly), **on-demand intake** (#8's clarify-then-produce), **new-site mode** (#15's authority-calibrated ceilings). Auto-retry robustness; cadence managed, never unsupervised.
- **C3 · Content — Quality & Decay Loop.** Two entry doors, one repair shop: grader-threshold sweep (≤5/run, targeted fixes only, ≤2 re-grade rounds) and decay detection (dual windows asked explicitly, false-decliner exclusion, provenance-based routing to regenerate vs O1 edits, site-wide flags to the E-suite). The closed loop that keeps the library compounding instead of rotting.
- **C4 · Content — Internal Link Weaver.** Post-batch link pass: ≤10 articles, 3–5 natural contextual links each, anti-reciprocal and skip-healthy hygiene, audit report. Scheduled after every C2 batch and every page-builder batch.
- **C5 · Content — Authority Pages Studio.** The AI-visibility flagship types: entity/About pages (platform + per-property), industry-leader editorial, category listicles, head-to-head comparisons. Carries the set's best discipline intact: numbered citations against Vault sources, citation-integrity verification, label-unknowns-TBD, neutral-tone enforcement, pre-defined evaluation criteria, substantiated-comparison tables. **This is V3's execution arm** — Trophy Content gaps route here.

**Honesty rules for C5's competitive content (non-negotiable additions):** LIQWD ranking itself #1 on its own site is inherently first-party — that's fine — but every claim must be substantiated from verifiable data, evaluation criteria must be disclosed in the piece, competitor descriptions must be accurate and neutral (comparative advertising that misleads creates Competition Act exposure, and inaccuracy is also just bad strategy for a trust brand), and the lint blocks superlatives without sources. The source's own "defensible, without exaggeration" framing agrees — LIQWD encodes it as a hard check rather than a style note. Real-estate-touching content additionally passes the RECO lint like everything else.

---

## Part 4 — Foundations & Fit

- **One near-new foundation: the content grader.** C2/C3 lean on an objective scoring model (structure, depth, coverage, intent alignment). Build as a rubric-driven evaluation prompt with numeric output stored per article version in the metrics warehouse — versioned like the compliance rulebook so grades are comparable over time. Everything else rides on existing plumbing (Vault, approval queue, GSC, page builders, O-suite).
- **Sequencing:** C1 + C2 together (network + engine — neither is useful alone) → C4 immediately after (links are cheap and compound) → C5 as soon as V3's first gap list exists (the market-report and "best platforms" pieces are also P1 pitch assets and P2 credibility assets) → C3 once there are ~90 days of published content to grade and watch.
- **Cross-suite wiring:** C1 ↔ G7/E2 planning · C2 output → approval queue → O3 indexing → C4 linking · C3 ↔ E1/E2 signals, routes edits to O1 · C5 ← V3 Trophy gaps, → P1 pitchable assets, → llms-full.txt (V2) inclusion · R6 market reports are C5-class content produced in Realtor Studio — same citation discipline applies.
- **Tier:** all five admin-tier for LIQWD properties. Agent-facing content lives in Realtor Studio (R3–R7), which inherits this set's mechanics (voice precondition, grade loop, evergreen filter) without exposing the machinery.

---

*Dissected: Website Studio (3→4), Smart Ads (24→13), Explorer (7→6), AI Visibility (6→3), OTTO (6→4), Local (11→7), Authority (10→3+E6), Content (15→5, one cross-listed, one rejected). Running total: 82 source playbooks → 53 LIQWD tools (incl. Realtor Studio's 8). Remaining set: Atlas.*
