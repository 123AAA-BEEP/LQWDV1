# LIQWD Playbook System — Explorer Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect the 7 Search Atlas Explorer playbooks — the SEO *intelligence* layer (research, diagnostics, reporting, planning) that sits over Search Console and rank data — and adapt them into LIQWD's suite. Companion to the Website Studio and Smart Ads blueprints; spec standard v1.1 applies throughout.

**What this set is:** where Smart Ads was hands-on-the-money and Website Studio was hands-on-the-pages, Explorer is almost entirely read-only analysis with staged handoffs to execution tools. That makes it the *cheapest set to build* and the one that makes every other set smarter — it's the eyes of the operation.

**Implementation detail worth noting:** the DAGs in this set expose the source platform's actual tool layer (`gsc_get_sites`, `gsc_get_pages`, `gsc_get_page_keywords`, `cg_update_article`, `otto_edit_suggestion`). This confirms the architecture LIQWD already chose — playbooks are system prompts orchestrating a named tool contract — and tells us the primary data dependency for this whole set: **Google Search Console API**.

---

## Part 1 — New Mechanics Extracted (Additions to the Library)

- **Brand exclusion first** (Lift Striking-Distance): before any keyword analysis, build an exclusion list from the Vault (brand/product names expanded into variants) and *confirm it with the user*. Branded queries pollute every opportunity analysis; excluding them is a named phase, not a filter buried in a query.
- **Objective evaluation rules** (Site Explorer): classification steps carry explicit safety rules — "avoid speculative causes or subjective quality labels." Pages are bucketed by observable behavior (Authority / Scale / Efficiency Gap / Support), never by guessed reasons.
- **Justify with metrics** (Executive Overview): every classification must be backed strictly by observed data — the report can't call momentum "strong" without the numbers that make it so. This is the reporting-layer twin of grounded generation.
- **Neutrality check** (Organic Competitors): competitor comparisons are constrained to strictly factual, non-praising, non-disparaging framing. Brand safety as a workflow node — directly reusable in anything client- or realtor-visible.
- **Executive layer separation** (Executive Overview): a report mode that deliberately outputs *no tactical steps* — visibility, momentum, efficiency, risk, and a 90-day directional focus only. Audience-appropriate altitude, encoded.
- **Tool routing at the edit level** (Lift Striking-Distance): staged changes are routed to the correct execution tool per change type (their Content Genius vs OTTO → LIQWD's content playbooks vs on-page playbooks). Extends the Smart Ads "recommend playbooks" pattern down to individual edits.
- **Capped opportunity selection** (Lift Striking-Distance): pick up to 10 high-impression, low-CTR keyword-page pairs per run — analysis output is bounded just like execution output, so downstream work stays reviewable.
- **Portfolio-level framing** (Keyword Portfolio): risk is assessed at the distribution level — Top-3 dependency, traffic concentration, intent mix, portfolio shape (Surface-Heavy / Mid-SERP-Heavy / Long-Tail / Balanced) — not keyword by keyword.

---

## Part 2 — Playbook-by-Playbook Review & Triage

All 7 are **Admin** tools; realtors never operate SEO intelligence directly. Agent-lite outputs are noted where the *results* eventually surface to realtors.

**1 · On Page SEO — Lift Striking-Distance Keywords → E1.** DAG: brand exclusion (Vault-sourced, user-confirmed) → GSC country scope → fetch positions 5–15 filtered to transactional/commercial intent → brand filters → top-20 pages by impressions → keyword-to-owning-page mapping → select ≤10 high-impression/low-CTR pairs → stage edits routed per type → report with scope stats and exclusions used. Textbook design; adopt nearly verbatim. *LIQWD notes:* runs against GSC on the resale site and each microsite; brand exclusions come from the Market Vault (project names, "LIQWD") plus realtor names on agent pages; staged edits route to the on-page playbook (title/meta/heading changes through the existing four-field SEO content protocol) vs the content playbook (section rewrites), and everything lands in the approval queue — thin-content and verified-facts rules unchanged.

**2 · Google Ads — Reconcile SEO & SEM Overlap.** Cross-listed here and in Smart Ads; already specced as **A7** in the Smart Ads blueprint. No second build. Its organic side reads the same GSC foundation this set establishes — one more reason GSC integration leads the build order.

**3 · Site Explorer — Find Page Growth Opportunities → E2.** DAG: pages report (URLs, traffic, keyword-to-traffic ratios) → pattern recognition (directory hierarchies, page templates) → typology classification with objectivity rules (Authority / Scale / Efficiency Gaps / Support) → structural analysis (template-driven scaling signals, cannibalization risks, visibility anchors) → distribution mapping → actionable focus areas. *This is the most strategically important playbook in the set for LIQWD*: it's programmatic-SEO intelligence — exactly the instrument for a site made of neighbourhood pages and project microsites. It answers "which page *template* earns its traffic, which template should scale to 50 more neighbourhoods, and where are two pages cannibalizing one query" — the questions the whole depth-first strategy turns on. Cannibalization detection also becomes a standing guard given microsites + main site can collide on project terms (the PBN/doorway risk already flagged).

**4 · SEO Research — Analyze Keyword Portfolio → E3.** DAG: domain confirmation → keyword metrics, traffic & intent mix, historical growth → diagnostics (Top-3 dependency risk, concentration, portfolio classification) → growth leverage (striking distance 11–20, exposure & intent gaps, SERP features) → portfolio profile + recommendations. *LIQWD notes:* the portfolio lens is the right instrument for the resale keyword strategy — it will show whether the hybrid funnel is over-concentrated in agent-selection terms vs buyer/seller intent, and its striking-distance output feeds E1. Runs quarterly per property.

**5 · SEO Research — Analyze Organic Competitors → E4.** DAG: domain + data ingestion → competitor segmentation (direct & aspirational; peripheral & SERP occupiers; neutrality check) → pressure analysis (keyword overlap concentration, paid-to-organic pressure signals, risk categorization) → strategic insights (top-3 pressure zones, structural differentiation areas) → landscape summary, segments table, implications. *LIQWD notes:* immediate application — the resale module's named competitor watchlist (realestateagents.com, nobul, rankmyagent, rate-my-agent) becomes the standing input; "paid-to-organic pressure" reveals which of them are buying their visibility (a direct input to the PPC underpriced-terms thesis); differentiation analysis runs with LIQWD's structural advantages in mind (verified agents, first-party market data, neighbourhood depth). Semi-annual per market, plus on-demand when entering a new geography.

**6 · SEO Reporting — Executive Performance Overview → E5.** DAG: verify domain → overview metrics + distribution & SERP features → performance classification (visibility scale, momentum, efficiency, SERP strength — each justified with metrics) → strategic signals + traffic-reliance analysis (branded vs non-branded, mid-SERP dependence) → executive output with 90-day directional focus, no tactical steps. *LIQWD notes:* becomes the monthly SEO report in the same family as A8 (ads) — together they're the ops review. The neutrality + justify-with-metrics rules make it safe to excerpt into investor updates or, later, translated realtor digests ("your neighbourhood pages this month").

**7 · Priority Plan — Creates a Holistic Action Plan → E6 (adapted with one major substitution).** DAG: link topology audit + top-10%-page identification (by revenue/conversion potential/rank growth) → strategy (internal link mapping, topical authority plan via their Domain Knowledge Network, distribution scheduling via WILDFIRE backlink deployment + instant indexing) → roadmap presentation with projected metrics → three-phase execution (internal linking → knowledge-network content → backlinks & indexing) → authority report. *LIQWD caution — the one place this library should NOT be followed:* WILDFIRE-style deployed backlink networks are rented links; on a real-estate marketplace whose ranking survival already depends on avoiding scaled-content enforcement, link-scheme risk is existential, and it contradicts the microsite rule (standalone assets, not link-equity vehicles). E6 keeps the excellent skeleton — priority-page identification, internal-link topology, topical-cluster planning, phased execution with projected metrics, indexing submission — and swaps the backlink phase for LIQWD-safe authority levers: internal linking architecture, topical clusters grounded in first-party data, agent E-E-A-T attribution at scale, and earned digital PR (market reports journalists cite) as a later, human-led phase.

---

## Part 3 — The LIQWD Explorer Suite (6 Tools)

- **E1 · SEO — Striking-Distance Lifter.** GSC-grounded 5–15 opportunity mining with Vault brand exclusions, ≤10 pairs/run, typed edit routing into the approval queue. The highest-frequency tool in the set (monthly per property; weekly during a push).
- **E2 · SEO — Site Growth Explorer.** Template/directory typology, scaling signals, cannibalization guard, visibility anchors. The programmatic-SEO instrument; also the pre-flight check before any batch of new neighbourhood pages or microsites ships.
- **E3 · SEO — Keyword Portfolio Analyzer.** Distribution health, concentration risk, intent mix, striking-distance and SERP-feature gaps. Quarterly strategy input; feeds E1.
- **E4 · SEO — Competitor Landscape.** Segmented competitive pressure with neutrality rules; standing watchlist for the resale module's named competitors; new-market entry analysis.
- **E5 · SEO — Executive SEO Report.** Metric-justified classification, 90-day directional focus, no tactics. Monthly; pairs with A8 as the ops review; excerpt-safe by construction.
- **E6 · SEO — Authority Action Plan.** Priority pages → internal-link + topical-cluster roadmap → phased execution with projected metrics → indexing submission. Backlink deployment explicitly excluded; earned-PR phase human-led.

(Reconcile SEO & SEM Overlap remains A7; E-suite tools emit findings it consumes.)

---

## Part 4 — Fit Into the Build

**New foundation piece:** **GSC integration** — Search Console API (site list, pages, queries, per-page keywords) pulled into the metrics warehouse alongside the ads data, per property (resale site + each microsite). Rank tracking beyond GSC can wait; GSC alone powers E1–E5 v1. This slots into the existing foundations list next to the ad-platform layer, and unlike the ad APIs it has no approval lead time — it can be wired up immediately.

**Sequencing within the suite:** E1 first (fastest payback, exercises GSC + edit routing + approval queue end-to-end), then E2 (must exist before neighbourhood-page volume scales), then E5 (reporting rhythm), then E3/E4/E6.

**Cross-suite wiring:** E1's staged edits → on-page/content playbooks; E2's cannibalization findings → content consolidation decisions and the microsite guardrail; E3's striking-distance output → E1's queue; E4's paid-pressure signal → PPC keyword targeting (L1/A5); E5 + A8 → the unified monthly ops report; E6's indexing phase → the Submit-New-URLs playbook (OTTO set, next dissection).

---

*Dissected so far: Website Studio (3 → 4 tools), Smart Ads (24 → 13), Explorer (7 → 6). Next priority sets: OTTO (on-page execution — E1/E6 route into it) and Local (maps directly onto neighbourhood strategy), then Content and Authority.*
