# LIQWD Playbook System — OTTO Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect the 6 Search Atlas OTTO playbooks — the on-page *execution* layer where staged SEO edits actually get applied — and adapt them for LIQWD. This is the set the Explorer tools route into (E1's staged edits, E6's indexing phase), so it closes the loop the intelligence layer opened. Companion to the Website Studio, Smart Ads, Explorer, and AI Visibility blueprints; spec standard v1.1 applies.

**Structural note — LIQWD's advantage over OTTO itself:** OTTO applies changes to customer sites it doesn't control via a pixel/edge-injection layer (hence its DAGs open with "check pixel installation, engagement state, un-frozen status"). LIQWD owns its sites: on-page changes are field updates in Supabase rendered server-side on deploy. That's simpler, faster, and better for SEO (no client-side injection for crawlers to miss). The playbook logic transfers; the delivery mechanism gets to be cleaner than the original.

---

## Part 1 — New Mechanics Extracted (Additions to the Library)

- **Queue-worker pattern with triage taxonomy** (Clear Remaining OTTO Tasks): pull the pending queue capped at 50 → group by issue type → per-item quality evaluation (truthfulness, character counts, uniqueness) → three-way disposition: approve / bulk-edit minor fixes / delete unfit (with confirmation) → backlog report (reviewed, edited, deleted, remaining). A playbook whose job is *processing other playbooks' output*.
- **Deployment-status precondition** (Clear Tasks; Expand Schema): before doing anything, verify the delivery mechanism is live and not frozen. LIQWD translation: property deploy pipeline healthy, page live, no pending migration — a concrete instance of the node-zero precondition check.
- **URL validity filtering before submission** (Submit New URLs): exclude non-200s, redirects, noindexed pages, taxonomy pages, and already-submitted URLs *before* anything reaches an indexing channel. Never submit what shouldn't be indexed.
- **Batch caps on infrastructure actions** (Submit New URLs): discovery batches ≤100, channel activation batches ≤50. Same blast-radius discipline as spend caps, applied to infra.
- **Unit-priced consent** (Submit New URLs): the optional paid boost quotes cost per unit ($0.10/URL), checks quota, and obtains explicit consent before spending. The *pattern* (per-unit price + consent before metered spend) joins the library even though the specific service doesn't (Part 2).
- **Schema-must-match-content lint** (Expand Schema): generated markup is validated against what's actually on the page — structured data may only claim what the page visibly states. The schema-layer twin of the verified-facts rule.
- **Character-count hard constraints** (Fix Critical Issues): titles 50–60 chars, metas 150–160, heading-length checks — mechanical rules enforced at generation, not style suggestions audited later.
- **Top-decile targeting** (Fix Critical Issues): work the top 10% of pages by issue count × severity, not the whole site. Prioritization as a filter node.
- **Grouped presentation for human review** (Clear Tasks; Optimize Priority Pages): recommendations arrive grouped by type with an implementation checklist and before/after comparison — the reviewer's time is treated as the scarce resource.

---

## Part 2 — Playbook-by-Playbook Review & Triage

All **Admin** tools. 6 sources → 4 LIQWD tools (one is the Explorer cross-listing).

**1 · Clear Remaining OTTO Tasks → O4 (adapted to LIQWD's own queue).** DAG: deployment-status + project preconditions → fetch queue (≤50) → group by issue type (titles, metas, schema, …) → evaluate copy quality (truthfulness, char counts, uniqueness) → bulk-edit minor fixes → delete unfit after confirmation → optional export + backlog report. *LIQWD adaptation is the interesting one:* LIQWD's draft-then-approve pipeline will accumulate its own backlog across every suite. O4 becomes **Approval Queue Triage** — an AI pre-triage pass over staged drafts before human review: verify each claim against Vault sources (truthfulness gets teeth the source can't match), enforce char constraints, bulk-fix minor copy issues, discard clearly-unfit drafts with a logged reason, and present the survivors grouped for fast human approval. Two-stage review: AI triages AI, human decides. This directly attacks the throughput bottleneck of the whole draft-approve architecture.

**2 · Lift Striking-Distance Keywords.** Cross-listed from Explorer — already specced as **E1**. Its "Stage Optimizations" node routes into O1 below; no second build.

**3 · Indexing — Submit New URLs → O3 (adapted channels).** DAG: date-threshold input → channel health check (Google instant-indexing service account + GSC permissions; Bing/IndexNow via Cloudflare Worker) → sitemap fetch + modified-after-cutoff extraction → validity filtering → batched add & activate (≤100 / ≤50) → optional paid RAPID indexer with unit-priced consent → report with per-channel status. *Two LIQWD deviations:* (a) Google's Indexing API is officially scoped to job-posting/broadcast content; using it for general pages is gray-area behavior on a domain whose survival depends on staying clean — O3 uses the compliant stack instead: disciplined sitemap management with lastmod integrity, GSC sitemap submission, IndexNow for Bing, and an *indexation-verification loop* (confirm pages actually got indexed, flag ones that didn't after N days — feeding E2's efficiency-gap analysis). (b) Skip third-party paid "rapid indexer" services entirely — same risk family as rented links. Keep the validity filter, batch caps, and channel-health checks verbatim.

**4 · Expand Schema Coverage → O2.** DAG: deployment precondition → project details + exclusion set (pages already covered) + page-level and org schema issues → select ≤10 uncovered pages by traffic/value → assign schema types matching actual content → generate + refine drafts → summary table + deployment steps for human approval. *LIQWD notes:* new pages get schema at build time (Website Studio specs); O2 is the *retrofit* tool for existing pages and the schema-issue fixer — same ≤10/run cap, exclusion discipline, and match-content lint, with LIQWD types (`RealEstateAgent`, `Residence`/`ApartmentComplex` for projects, `FAQPage`, `Service`) staged as structured fields, not injected markup.

**5 · Optimize Priority Pages → O1 (merged with #6).** DAG: Vault context + project confirmation → audit target pages (performance, titles, metas, headings) + keyword/intent alignment + content & structure (internal linking, duplicate content, image optimization) → optimization strategy via their OTTO Brain → recommendations (titles, metas, content updates) → present for review + internal-link map with implementation checklist → apply approved changes → final report. The comprehensive on-page engine, with the "Executed by: Technical SEO Lead" persona line — the pattern the LIQWD spec standard already adopted.

**6 · Fix Critical Issues → O1 (merged with #5).** DAG: filter top 10% pages by issue count & severity → metadata audit (length, uniqueness, keyword usage) + heading hierarchy evaluation → generate optimized titles (50–60), metas (150–160), refined heading structure → before/after comparison report. The focused fast-path subset of #5 — one tool with two modes, not two tools.

---

## Part 3 — The LIQWD OTTO Suite (4 Tools)

- **O1 · On-Page — Page Optimizer.** Merge of Optimize Priority Pages + Fix Critical Issues. Two modes: **Deep** (full audit: metadata, headings, keyword/intent alignment, internal linking, duplicates, images → recommendations + internal-link map + checklist) and **Critical** (top-decile by issue severity → titles/metas/headings only, char-constrained, before/after). Both modes: Vault-grounded, staged through the four-field SEO content protocol into the approval queue, applied server-side on approval. This is the execution target for E1's routed edits and E2's template findings.
- **O2 · On-Page — Schema Retrofit.** Coverage scan minus exclusion set → ≤10 pages/run by traffic/value → type assignment with match-content lint → staged structured-data fields → approval → deploy. Complements build-time schema from the Website Studio set.
- **O3 · Indexing — Submit & Verify.** Date-threshold discovery → validity filter → compliant channels (sitemaps with lastmod integrity, GSC submission, IndexNow) in capped batches → **verification loop**: confirm indexation, flag stragglers after N days into E2's queue. No gray-area API use, no paid indexer services. Auto-suggested after every page-publishing playbook (already wired in the Website Studio specs).
- **O4 · Ops — Approval Queue Triage.** The meta-tool: AI pre-triage of LIQWD's own staged-draft backlog, ≤50 items/run — Vault-verified truthfulness check, char-constraint enforcement, bulk minor fixes, confirmed deletion of unfit drafts with logged reasons, grouped presentation for human approval, backlog report. Raises throughput of every other suite without weakening the human gate.

---

## Part 4 — Fit Into the Build

- **No new foundations.** This set rides entirely on what's already specced: Supabase page fields + deploy pipeline (delivery), GSC integration (E-suite), Vault (grounding), approval queue (Website Studio plumbing). Cheapest set so far in infrastructure terms.
- **Sequencing:** O1 first (it's what E1 routes into — the intelligence loop is open until it exists) → O3 (every new page batch needs it; pairs with microsite launches) → O4 (build once queue volume is real — likely soon after the page builders go live) → O2 (retrofit work, schedule-driven).
- **Cross-suite wiring:** E1 staged edits → O1 · E2 template findings + O3 indexation stragglers → O1/E2 · Website Studio publishes → O3 · every suite's staged drafts → O4 → human approval · O1/O2 outputs → four-field SEO protocol → server-side render.
- **A note on cadence:** O1-Critical + O3 + O4 are the natural weekly rhythm tools; O1-Deep and O2 are monthly/quarterly. The Schedule affordance from the card layer maps directly.

---

*Dissected: Website Studio (3→4), Smart Ads (24→13), Explorer (7→6), AI Visibility (6→3), OTTO (6→4, one cross-listed). Running total: 46 source playbooks → 30 LIQWD tools. Remaining sets: Local, Content, Authority, Atlas — Local next recommended (neighbourhood strategy).*
