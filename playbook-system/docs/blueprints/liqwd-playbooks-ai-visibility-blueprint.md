# LIQWD Playbook System — AI Visibility Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect the 6 Search Atlas AI Visibility playbooks — the generative-engine-optimization (GEO) layer that tracks and improves how ChatGPT, Gemini, Perplexity, Claude, and Copilot represent a brand — and adapt them for LIQWD. Companion to the Website Studio, Smart Ads, and Explorer blueprints; spec standard v1.1 applies.

**Why this set matters more for LIQWD than for a typical Search Atlas customer:** real-estate discovery is migrating into AI answers — "best pre-construction projects in Mississauga," "is buying pre-construction worth it in 2026," "best realtor in Port Credit." LLMs strongly prefer citing structured, verifiable, first-party data — which is precisely LIQWD's asset (verified project records, market datasets, RECO-verified agents). Classic SEO is a fight against higher-authority incumbents; AI visibility is closer to open ground where data quality beats domain age. And downstream, "be the agent AI recommends in your neighbourhood" is a realtor-tier product none of the incumbent portals are selling yet.

**Tool layer note:** this set's DAGs expose an `limv_*` tool family (list/add topics & queries) — a scheduled LLM-visibility tracker. LIQWD has no equivalent yet; it becomes this set's foundation piece (Part 4).

---

## Part 1 — New Mechanics Extracted (Additions to the Library)

- **Quota as guardrail** (Maintain Prompt Universe; Expand Topics; Refine Prompts): tracked-query slots are a budget. Check availability first, warn before consuming, and put a *final quota gate* before deployment. Any metered resource in LIQWD (tracking slots, API budgets, generation credits) gets the same three-step treatment.
- **Consent & capacity node** (Refine Prompts): before changing what's tracked, inform the user of capacity limits and obtain explicit consent. Consent for *state changes to monitoring*, not just for writes to external platforms.
- **Query universe hygiene** (Maintain Prompt Universe): the tracked set is a living asset — spot language shifts (new buyer phrasing, competitor names, emergent question forms), flag stale/inert queries for removal, confirm removals explicitly, batch additions capped (≤20/run) with broad-vs-branded classification. Monitoring inputs get the same maintenance discipline as monitoring outputs.
- **Authority-scored page graph** (Create llms.txt): pages weighted by type (Homepage 100 / Products 95 / Docs 90 / Blog 60), assembled into an internal hierarchy before curation. Structural importance is declared, not inferred by the LLM.
- **Dual-artifact output** (Create llms.txt): a lightweight curated summary (`llms.txt`) plus a comprehensive reference (`llms-full.txt`) — same knowledge, two consumption depths. Reusable pattern for any machine-audience artifact.
- **Gap taxonomy** (Find Content Opportunities): visibility gaps classified as **Missing / Weak / Negative Sentiment** — three different problems with three different fixes, never collapsed into one list.
- **Trophy Content mapping** (Find Content Opportunities; Refine Prompts): each gap maps to a named content archetype optimized for LLM citation (Listicle, Review, Comparison, Semantic Knowledge Pack) with intent and key entities specified. Content recommendations arrive as build-ready specs.
- **Prompt diagnosis & intent classification** (Refine Prompts): draft tracked queries are diagnosed (overloaded, keyword-stuffed, unrealistic), classified by intent (Branded / Competitor / Category Discovery), safety-enforced (reject or rewrite defamatory/negative-brand prompts), and taught back via bad-vs-good comparisons. Meta-quality control: prompts about the brand are themselves quality-gated.
- **Brand-safe / competitor-neutral rules, again**: every generation step in this set filters negative brand framing and forces factual competitor treatment — same neutrality doctrine as the Explorer set, now applied to machine-facing text. Confirmed as a universal guardrail node.

---

## Part 2 — Playbook-by-Playbook Review & Triage

All six are **Admin** tools initially; the realtor-tier angle (Part 5) comes later. Heavy overlap → 6 sources consolidate to 3 LIQWD tools.

**1 · Maintain Prompt Universe → V1.** DAG: audit tracked universe (list projects/topics/queries, active-vs-inert performance) → identify gaps & noise (language shifts, stale queries) → quota & structure prep (warn/confirm quota, create topics) → execute & report (capped batch adds with classification, explicit removal confirmation, quota-impact report). The maintenance loop for the tracked set.

**2 · Create llms.txt → V2.** DAG: resolve domain & existing knowledge graph → discover & clean sitemap (dedupe, strip utility/admin pages) → authority scoring + internal graph → knowledge extraction (5–15 canonical facts, product taxonomies, ideal customer types; preferred terminology, key entities, core Q&A; 30–60 curated authoritative URLs in semantic sections) → generate `llms.txt` + `llms-full.txt` → QA (single H1, absolute URLs, AI clarity) → deploy as text/plain, verify HTTP 200. Near-zero-cost, high-leverage; the knowledge-extraction phase maps 1:1 onto LIQWD's Market Vault — canonical facts come *from the vault*, not from re-crawling.

**3 · Analyze Citation Gaps → V3 (citation-intelligence half).** DAG: visibility audit vs competitors across four LLMs → extract & dedupe missing citations into top-100 referring domains → approval gate on the gap report → analyze top-10 domains for guest posts / digital PR / content placements. *Same caution as Explorer E6, milder form:* earned citations and digital PR are fine; paid guest-post placement drifts toward link schemes. LIQWD keeps the citation-source intelligence and routes outreach as human-led earned PR only.

**4 · Expand Topics & Questions → V1.** DAG: project & quota check → brand-context inference (products, commercial intent, positioning, personas) → generate 8–15 conversational topics × 5–10 natural queries each, mimicking real ChatGPT-style research phrasing, brand-safe rules applied → user review & edits → final quota gate → deploy to tracker. The generation half of the universe manager.

**5 · Find Content Opportunities → V3 (gap-to-content half).** DAG: review visibility report → safety filtering (brand safety + competitor neutrality) → gap identification & Missing/Weak/Negative-Sentiment classification → Trophy Content mapping with intent & entity specs → competitor-citation intelligence + source prioritization → structured report (gaps, trophy recommendations, citation opportunities). The bridge from measurement to content production.

**6 · Refine AI Search Prompts → V1.** DAG: validation, quota, consent & capacity → draft diagnosis, intent classification (Branded/Competitor/Category), safety enforcement → rewrite with bad-vs-good education → map to Trophy types → deploy. The quality-control half of the universe manager.

---

## Part 3 — The LIQWD AI Visibility Suite (3 Tools)

- **V1 · AI Vis — Query Universe Manager.** Merge of #1 + #4 + #6: one tool owning the tracked-query lifecycle — generate (brand-context-inferred topics and natural-language queries), refine (diagnosis, intent classification, safety enforcement), and maintain (language-shift detection, stale-query removal, capped classified additions), all behind quota gates and user review. *LIQWD universes:* platform ("best pre-con platform GTA", project-name queries), market ("should I buy pre-construction 2026", neighbourhood queries), and — later — per-realtor ("best realtor in <neighbourhood>").
- **V2 · AI Vis — llms.txt Generator.** Vault-grounded knowledge extraction (canonical facts from verified project/market data — never re-derived from page scrapes), authority-scored URL curation per property, dual-artifact generation, QA, deploy + verify. Runs per property (main site, resale site, each microsite) and *regenerates on Vault changes* — a small trigger the source can't offer because it doesn't own the data layer. Agent pages later get structured agent-entity blocks (name, RECO, brokerage, neighbourhoods served) so LLMs can cite realtors precisely.
- **V3 · AI Vis — Gap Analysis & Trophy Content.** Merge of #3 + #5: visibility audit across the four LLMs → Missing/Weak/Negative-Sentiment gap classification → Trophy Content specs translated to LIQWD archetypes (neighbourhood guides, project comparisons, "best X in Y" listicles backed by first-party data, market-report knowledge packs — all subject to the thin-content gate and verified-facts rules) → citation-source intelligence with earned-PR-only routing → structured report feeding the content playbooks. Negative-sentiment findings additionally raise an admin flag — reputation issues in AI answers deserve a human eye, not just a content queue.

---

## Part 4 — Foundation Piece: The LLM Visibility Tracker

The set assumes a tracker LIQWD must build — and it's modest: a scheduled service that runs the tracked query universe against the ChatGPT/Gemini/Perplexity APIs (Copilot/Claude as feasible), parses answers for brand/project/competitor mentions, citation URLs, and sentiment, and writes results to the metrics warehouse alongside GSC and ads data. Components: query store (V1 manages it), scheduled runner with per-model adapters, mention/citation/sentiment parser, and history tables for trend reporting. Cost control is the quota discipline from Part 1 applied to LIQWD's own API spend. This is a genuine build ticket, but a contained one — and it produces a dataset none of the real-estate incumbents are collecting.

Reporting rides existing rails: AI-visibility trends join E5's monthly SEO report rather than spawning a fourth report.

---

## Part 5 — The Realtor-Tier Angle (Later, but Real)

Once the tracker runs and agent pages carry structured entity data, the agent-tier product writes itself: **"What does AI say about you?"** — per-realtor visibility tracking on neighbourhood-level queries, a monthly plain-language digest ("when buyers ask AI for a Port Credit agent, here's who comes up — and here's what moves you up"), powered by V1 universes per agent and V3 gap analysis routed into their LIQWD pages. Sequencing: admin-first like everything else; ship only after platform-level visibility tracking has 60+ days of history and the methodology is trustworthy. Priced as a premium add-on to the realtor tier — it's a differentiator no portal currently offers.

---

## Part 6 — Fit Into the Build

- **New foundation:** LLM Visibility Tracker (Part 4). Slots beside GSC integration; no external approval lead times, just API keys and the runner.
- **Near-free quick win:** V2 on the main site can ship almost immediately — the Market Vault already holds the canonical facts, and deployment is a static file per property. Do this early; it's the cheapest item in the entire program.
- **Sequencing within the set:** V2 first (no tracker dependency) → tracker foundation → V1 (seed universes) → 30–60 days of data → V3 (gap analysis needs baseline history to be meaningful).
- **Cross-suite wiring:** V3's trophy specs → content playbooks (Content set, pending dissection) under the thin-content gate; V3's citation intelligence → E6's earned-PR phase; V2 regeneration ← Vault change events; AI-visibility metrics → E5 monthly report; negative-sentiment flags → admin review queue.

---

*Dissected so far: Website Studio (3→4), Smart Ads (24→13), Explorer (7→6), AI Visibility (6→3). Running total: 40 source playbooks → 26 LIQWD tools. Remaining sets: OTTO, Local, Content, Authority, Atlas.*
