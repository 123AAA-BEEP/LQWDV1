# LIQWD Playbook System — Smart Ads Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect all 24 Search Atlas Smart Ads playbooks (full detail views reviewed, including every step-DAG), extract the execution mechanics worth stealing, consolidate the overlapping set into a tighter LIQWD-native suite, and tier everything for the two audiences: internal admin first, then a hardened realtor-facing subset sold as part of the agent tool tier.

**Companion to:** `liqwd-playbooks-website-studio-blueprint.md` (spec standard, Vault, Agent Brand, design system, and the PPC Landing Page playbook all defined there). This document extends the spec standard with the safety mechanics discovered in this set.

**Critical audience note:** the source playbooks are written for agency PPC operators. LIQWD's admin tier can keep that sophistication; the realtor tier cannot assume any of it. Section 5 defines the translation rules.

---

## Part 1 — New Execution Mechanics (Extracted From the DAGs)

The Website Studio set taught the four-phase spine. The Smart Ads set — because it touches live money — adds a *safety mechanics library*. These node-level patterns, pulled from the right-side step graphs, are the difference between a prompt and an employee you'd trust near a budget. Every one becomes a reusable building block in LIQWD's spec standard (v1.1 additions, Part 6).

**Honesty & boundary mechanics**
- **State Tool Limitations / Establish Boundaries** (Meta Refresh Creative; Maintain Negatives): the run *opens* by telling the operator what it cannot do ("drafts only — no publish path to Meta"; "search-term query data unavailable"). Honest capability disclosure as a first-class node. LIQWD rule: any playbook with a known blind spot states it before doing work, never after.
- **Disclose Coverage / Blind Spots** (Daily Pulse; Branded Search; LP CRO; Cross-Channel): explicitly flag unimported campaigns, missing final URLs, or unverifiable data so the report can't imply completeness it doesn't have.
- **Fail-Safe Evaluation** (Monitor Anomalies): unreadable checks are marked **UNVERIFIABLE**, never reported as clean. "Avoid false comfort" is the exact right doctrine for monitoring.
- **Confidence Tiers / Apply Metric Boundaries** (LP CRO; Daily Pulse; Cross-Channel): classify findings as *observed* vs *heuristic*; adjust for learning phases, conversion delays, timezone alignment, and blended-metric pollution before making any claim. Analytical humility encoded as steps.

**Spend-safety mechanics**
- **Dual disjoint evaluation windows** (Kill Zero-Conversion Ad Groups): a kill decision requires failure across two independent windows of ≥30 days — no single-window kills.
- **Spend & click floors** (same): low-traffic entities are exempt from underperformance verdicts; you can't fail a test you never got traffic to take.
- **Capped execution** (everywhere): pause up to 5 confirmed clusters; apply max 20 negatives per run; budget-raise proposals capped at ±20–25%; bounded cross-channel shifts (≤15% of the weaker channel). Blast-radius limits on every write.
- **Cooldown rules** (Branded Search): entities modified or rejected in the last 7 days, or in a learning phase, are excluded from new proposals. Prevents thrash.
- **Budget neutrality / zero-sum proposals** (Guard Budget Allocation): reallocations hold the account total steady — shifting is safe in a way that raising is not.
- **Side-effect awareness** (Kill Zero-Conversion): pausing is done in a way that avoids triggering budget recalculations elsewhere. Every write names its second-order effects.

**Correctness mechanics**
- **Deterministic conflict simulation** (Mine Search-Term Waste): before proposing any negative keyword, *simulate* it against all active positive keywords and reject anything that would block them. Not "be careful" — an actual simulator step.
- **Historical conversion check** (same): no proposed negative may have converted in a 90–180 day safety window.
- **Protected lexicon guard** (same): brand, product, geo, and category terms are structurally unblockable.
- **Over-negation guard** (Cut Wasted Spend): verify candidates won't block high-intent or converting traffic; prefer theme-level negatives over one-off exacts.
- **Deduplicate against existing state** (multiple): every proposal checks what's already applied — no redundant additions, no re-proposing the rejected.
- **Explicit mapping validation** (Kill Zero-Conversion): before executing on IDs, present the human a readable mapping (keyword cluster → ad group → spend at stake) and get confirmation on the *mapping*, not just the action.

**Sequencing & system mechanics**
- **Foundation-first dependency** (Audit Conversion Tracking): conversion tracking is audited as "the foundation every other paid loop silently assumes" — broken tags, role drift, value pollution, stale offline imports, goal changes. LIQWD encodes this as a hard dependency: optimization playbooks check tracking-health status and warn or refuse when the foundation is untrustworthy.
- **Playbook routing** (Detect Critical Issues → Recommend Playbooks): a detection playbook's terminal node maps findings to the specific execution playbook that fixes each. This is what turns a tool list into an employee — findings arrive with their own next step.
- **Paused deployment** (all three Launchers): campaigns publish in a **paused** state, never auto-activate. The launch playbook's job ends at a fully built, reviewable, dormant campaign.
- **Quality gates pre-publish** (Launch Branded): structural checks (exact keyword minimums, no generic terms, no trademarked competitor names in copy) run as a gate before the paused publish.
- **Terse alerting / quiet-when-clean** (Monitor Anomalies): monitors say nothing when nothing is wrong, and lead with severity and numbers when something is. Alert fatigue is treated as a real failure mode.
- **Incrementality honesty** (Branded Search; SEO/SEM Reconcile): brand spend is valued as *rarely fully incremental*; holdout tests are recommended before raising brand budgets. The system argues against its own spend when the data says so.

---

## Part 2 — Full Triage (All 24)

Tiering key — **Admin**: internal LIQWD ops tool. **Agent-core**: hardened, translated, sold in the realtor tier. **Agent-lite**: agent sees a plain-language *output* (digest/alert), never operates the tool. **Merge**: consolidated into a LIQWD suite tool (Part 3) rather than cloned 1:1.

| # | Source playbook | Verdict | Notes |
|---|---|---|---|
| 1 | Meta Ads — Refresh Fatigued Creative | Admin → Agent-lite · **L2** | Hook/hold-rate sensing + iteration briefs are excellent. LIQWD can beat the source: they have no Meta publish path; LIQWD's planned FB/IG API integration closes the loop (with approval gate + Agent Brand assets). |
| 2 | Paid Media — Kill Zero-Conversion Ad Groups | Admin · **A2** | Dual-window + floors + capped pause + mapping confirmation: adopt all four mechanics. Kill decisions are never realtor-facing. |
| 3 | Paid Media — Clean Up Keyword Structure | Admin · **A2** | Match-type/grouping hygiene, staged fixes, no budget/approval-state touches. Pure operator tool. |
| 4 | Paid Media — Guard Budget Allocation | Admin · **A6** | Starved/Wasteful/Steady classification + zero-sum proposals + impression-share-lost-to-budget-vs-rank evidence. Keep the rubric-driven gates. |
| 5 | Paid Media — Unblock Negative Conflicts | Admin · **A1** | Negatives blocking active bids; no auto-delete. Merges into the unified negatives engine. |
| 6 | Paid Media — Maintain Negative Keywords | Admin · **A1** | Boundary disclosure + max-20 cap + explicit-approval sync. Merges into A1. |
| 7 | Google Ads — Boost Landing Page Conversion Rate | Admin · **A4** | CRO rubric + A/B test recommendations, read-only. Merges with #16. |
| 8 | Google Ads — Strengthen Your Ad Copy | Admin → Agent-lite · **A3** | The set's cleanest full loop: audit → draft → approve → publish. The publish node makes its approval gate load-bearing. Realtors see before/after proposals in plain language; approval semantics stay identical. |
| 9 | Google Ads — Cut Wasted Spend | Admin · **A1** | Theme negatives + over-negation guard + confirm-before-apply. Merges into A1. |
| 10 | Google Ads — Detect Critical Issues | Admin + Agent-lite · **M1** | Read-only breach scan with severity grouping and playbook routing. The routing node is the pattern of the whole set. Agent-lite version: plain-language alert ("your ads stopped running — we're on it / here's the fix"). |
| 11 | Google Ads — Daily Performance Pulse | Admin + Agent-lite · **M2** | Scheduled read-only Scale/Cut/Test/Fix scan with baseline windows and analytical caveats. Agent-lite: the weekly digest realtors actually read. |
| 12 | Google Ads — Optimize Branded Search | Admin · **A5** | Cooldowns, capped raises, incrementality honesty, PMax cannibalization exposure. For realtors, "brand" = their name + team name — thin but real (defense against competitor conquesting on agent names). |
| 13 | Paid Media — Review Cross-Channel Efficiency | Admin · **A6** | Google vs Meta on a normalized cost-per-outcome, bounded shifts, documented attribution assumptions, Google-only fallback mode. Directly relevant once LIQWD runs both channels. |
| 14 | Google Ads — Audit Conversion Tracking | Admin · **M3** | The foundation audit. Runs on a schedule; its health status becomes a precondition flag other playbooks read. Never realtor-facing, but everything realtors buy depends on it. |
| 15 | Google Ads — Mine Search-Term Waste | Admin · **A1** | The crown jewel of the set: n-gram waste scoring + deterministic simulator + protected lexicon + historical conversion check + human review routing. A1 inherits this as its engine. |
| 16 | Google Ads — Audit Landing-Page CRO | Admin · **A4** | Ad→page mapping, multi-device rubric (message match, above-fold, single goal, friction, trust, CWV), experiment specs, gated URL re-pointing. LIQWD's closed-loop advantage: findings feed the PPC Landing Page builder directly. |
| 17 | Google Ads — Optimize Non-Branded Search | Admin · **A5** | Five-lever diagnosis (IS-to-rank vs budget, quality, geo CPA, value-bidding gap, hygiene) + learning-phase-aware staged value-bidding migration. The most advanced playbook in the set; admin-only forever. |
| 18 | Google Ads — Monitor Anomalies & Guardrails | Admin · **M1** | Near-duplicate of #10 with better mechanics (fail-safe UNVERIFIABLE tiers, terse alerting, timezone-gated checks). M1 = merge of #10's routing + #18's rigor. |
| 19 | Google Ads — Reconcile SEO & SEM Overlap | Admin · **A7** | Special for LIQWD: the source uses platform organic intelligence; LIQWD owns *actual* organic data (microsites, resale site, GSC). Stop paying for clicks LIQWD pages already win; surface where paid props up weak organic → route to content playbooks. A genuine moat tool. |
| 20 | Google Ads — Audit Ad Copy Quality | Admin · **A3** | RSA strength + asset completeness (sitelinks, callouts, snippets, images, lead forms) + brand-voice-respecting drafts. Merges with #8; Agent Brand supplies the voice. |
| 21 | Google Ads — Audit Account Performance | Admin · **A8** | The umbrella: bucket segmentation (Branded/Non-Branded/Retargeting), Defense/Offense/Tactics staging, unified impact summary with net savings + estimated lift. The quarterly-review artifact — also the admin report that *sells* the managed service to realtors. |
| 22 | Google Ads — Launch Branded Campaign | Admin → Agent (adapted) · **L1** | Competitor-conquest defense, quality gates, paused publish, landing-page assignment. Realtor version: name-defense module inside L1. |
| 23 | Google Ads — Launch Core Campaign | Admin → Agent (adapted) · **L1** | Multi-campaign structure from website analysis. For realtors, "products" = offers (valuation, buyer consult, neighbourhood expertise) — L1's spine. |
| 24 | Google Ads — Launch Product Campaign | Admin → Agent (adapted) · **L1** | Single-offer STAG structure, budget-floor flags, keyword caps, paused delivery. The single-offer mode of L1. |

**Headline:** 24 source playbooks → **13 LIQWD tools** (3 monitors, 8 audits/optimizers, 2 launchers). The source library has real redundancy — four negatives tools, two breach scanners, two ad-copy tools, two LP-CRO tools, three launchers — because it grew by accretion. LIQWD builds the consolidated version with best-of-breed mechanics from each, which is both less work and a better product.

---

## Part 3 — The LIQWD Smart Ads Suite (13 Tools)

### Monitors — scheduled, read-only, quiet-when-clean
- **M1 · Ads — Daily Breach Scan.** Merge of Detect Critical Issues + Monitor Anomalies. Timezone-gated daily run: account status, gone-dark campaigns, disapprovals, budget pacing (>130% / <50%), CPA blowouts vs settled baseline. Fail-safe tiers (UNVERIFIABLE ≠ clean), terse severity-first alerting, findings routed to the specific A-tool that fixes them. *Agent-lite output:* plain-language alert with the fix already queued.
- **M2 · Ads — Performance Pulse.** Daily/weekly Scale-Cut-Test-Fix scan vs rolling baseline, with coverage disclosure and analytical caveats (learning phases, conversion lag). *Agent-lite output:* the weekly digest — leads, cost per lead, what changed, what LIQWD is doing about it.
- **M3 · Ads — Conversion Tracking Health.** Weekly foundation audit: stalled/silent actions, role drift, value pollution, stale offline imports, goal-change boundaries. Publishes a `tracking_health` status flag that every other suite tool checks as a precondition; proposes config fixes for admin confirmation.

### Audits & Optimizers — on-demand, read-only, propose-and-confirm
- **A1 · Ads — Negatives Engine.** Unification of four source tools around Mine Search-Term Waste's machinery: n-gram waste scoring → protected lexicon guard → deterministic conflict simulator → 90–180d historical conversion check → dedupe → theme-first proposals with match type & placement → human review routing (competitor/brand/under-converting split) → capped apply (≤20/run). Also runs the reverse direction (negatives blocking active bids) and list hygiene from #5/#6.
- **A2 · Ads — Structure & Zero-Conversion Cleanup.** Keyword-cluster hygiene (match-type, grouping, internal competition) + dual-window zero-conversion ad-group kills with spend/click floors, mapping confirmation, capped pauses, no budget side-effects.
- **A3 · Ads — Ad Copy Studio.** RSA strength + completeness audit (headline/description coverage, pinning, asset set: sitelinks, callouts, snippets, images, lead forms) → drafts grounded in Agent Brand voice and the message-match brief → before/after proposals → approval → publish. The suite's second write-path tool; approval gate is load-bearing.
- **A4 · Ads — Landing Page CRO Loop.** Ad→served-page mapping with coverage gaps disclosed → confidence-tiered scoring on the CRO rubric (message match, above-fold clarity, single goal, form friction, trust, speed/CWV, mobile) → single-variable experiment specs. **LIQWD closed loop:** specs are emitted in the PPC Landing Page playbook's brief format, so the fix is one approved run away and the variant system already exists. Gated URL re-pointing only.
- **A5 · Ads — Branded & Non-Branded Search Optimizer.** Brand side: IS recovery with capped raises, cooldowns, rank-pressure diagnosis, PMax cannibalization exposure, incrementality honesty (holdout recommendation before budget raises). Non-brand side: five-lever diagnosis and the staged, learning-phase-aware value-bidding migration. Admin-only permanently.
- **A6 · Ads — Budget Guard & Cross-Channel.** Rubric-gated Starved/Wasteful/Steady classification, zero-sum reallocation proposals, impression-share evidence (lost-to-budget vs lost-to-rank), bounded Google↔Meta shifts on a normalized cost-per-lead with documented attribution assumptions and Google-only fallback.
- **A7 · Ads — SEO & SEM Reconcile.** LIQWD-owned organic data (GSC + rank tracking on microsites/resale pages) joined to paid keyword performance: stop paying where organic ranks 1–3 and wins; flag paid-propped weak organic as content-playbook input; brand-defense exemptions; measured pauses/bid cuts with 2–4 week watch windows. **Moat tool** — the source can't match first-party organic depth.
- **A8 · Ads — Account Performance Review.** The umbrella: bucket-relative analysis (Branded/Non-Branded/Retargeting), Defense/Offense/Tactics staging, unified impact summary (net savings + estimated lead lift), execution authorization checklist. Doubles as the monthly/quarterly client-facing report that sells the managed service.

### Launchers — write path, always publish-paused
- **L1 · Ads — Campaign Launcher.** One launcher, three modes replacing the three source playbooks: **Offer mode** (single-offer STAG: valuation / buyer consult / listing promo), **Full mode** (multi-campaign structure across a realtor's offers), **Name Defense mode** (branded conquest protection on the agent/team name). Shared spine: inputs (offer, neighbourhoods, budget with floor flags, goal) → structure & budget allocation → high-intent keyword selection with caps and negatives seeded from A1's lexicon → RSAs from Agent Brand + message-match brief → quality gates (keyword minimums, no trademarked competitor names, RECO lint) → landing pages assigned from the LIQWD page builder → **publish paused** → structural summary for approval. *Realtor UX:* pick offer, pick neighbourhoods, set monthly budget in dollars — everything else is the machine.
- **L2 · Ads — Meta Creative Engine.** Performance-ranked creative fatigue detection (hook & hold rates, 7d vs 30d shift) → top-5 candidate selection excluding fresh launches → iteration briefs → variant generation from Agent Brand assets in the chosen design template → verification → approval → publish via LIQWD's Meta API integration (upgrading the source's manual-upload handoff), with caps and paused-first delivery.

---

## Part 4 — The Two-Phase Business Model (Admin First, Then Sell to Agents)

**Phase 1 — Internal admin (managed-service backbone).** All 13 tools run on LIQWD-controlled ad accounts under an MCC (and Meta Business Manager), driving LIQWD's own lead gen — the resale funnel first. This is where the suite gets hardened on real spend, and where every audit's "net savings / lead lift" summary becomes proof material.

**Phase 2 — Sell to agents, two packaging options (not mutually exclusive):**
- **Managed campaigns (recommended first):** realtor buys outcomes — "your lead campaign, run by LIQWD." Under the hood it's L1 + the monitors + A1/A3/A4 on LIQWD-managed accounts. Realtor touchpoints: offer/geo/budget selection, approval taps, the M2 digest, and M1 alerts. No PPC literacy assumed; margins live in the automation.
- **Connected accounts (later, premium):** sophisticated realtors/teams connect their own Google Ads / Meta accounts; the agent-adapted tools operate on them with the same caps, approvals, and RECO lint. Higher trust bar; ship only after the managed tier proves the guardrails.

This sequencing matches the platform thesis: leads routed internally first, then the toolset becomes a realtor-tier monetization asset.

**The one architecture decision to lock before build:** account topology. Recommendation — **LIQWD MCC with one sub-account per campaign client (and LIQWD's own properties as the first clients)**, Meta equivalent via Business Manager. It gives clean per-realtor spend caps and reporting, keeps Phase 2's connected-account option open (MCC link requests), and is what the API access model expects.

---

## Part 5 — Agent-Audience Translation Rules

The source library speaks operator. The realtor tier follows these rules everywhere:

1. **Currency is leads and dollars.** Every realtor-visible number is spend, leads, cost per lead, or dollars saved. CTR, IS, Ad Rank, match types, CPA never appear in agent UX; they live in an expandable "details" layer at most.
2. **Findings arrive translated and pre-solved.** Not "12 negative keyword conflicts detected" but "you were paying for searches like *'free home evaluation jobs'* — we've blocked them; that recovers about $140/month." Every alert names the fix already queued.
3. **Approvals are decisions, not audits.** A realtor approval screen presents one plainly-stated decision with the stakes ("Pause these two ads that spent $211 with zero leads? Budget shifts to your Port Credit campaign."), never a table of IDs.
4. **The machine's honesty mechanics surface as trust language.** UNVERIFIABLE tiers, coverage gaps, and learning-phase caveats become "we're not counting last week yet — leads take a few days to settle," not silent omissions.
5. **Hard rails are invisible and non-negotiable.** Spend caps, cooldowns, capped changes, paused-first publishing, and RECO lint run identically regardless of what the realtor clicks. The agent tier gets *fewer* knobs than admin, never looser rails.
6. **Everything compounds into one monthly story.** The A8 report, translated: what you spent, what you got, what we fixed, what's next. This artifact is the retention engine for the managed tier.

---

## Part 6 — Spec Standard v1.1 Additions

The Website Studio blueprint's spec template gains two sections, mandatory for every spend-adjacent playbook:

```
7. SAFETY MECHANICS (select from the library; justify omissions)
   Boundaries stated up front · coverage/blind-spot disclosure · fail-safe
   UNVERIFIABLE tiers · confidence tiers (observed vs heuristic) · dual-window
   evaluation · spend/click floors · capped execution (named caps) · cooldowns ·
   zero-sum-only budget moves · side-effect statements on every write ·
   deterministic conflict simulation · historical-conversion safety window ·
   protected lexicon · dedupe vs current state · mapping confirmation before
   ID-level execution · paused-first publishing · pre-publish quality gates ·
   terse quiet-when-clean reporting · incrementality honesty

8. DEPENDENCIES & ROUTING
   Preconditions read (e.g. tracking_health from M3, brand completeness from
   Agent Brand) · which playbooks this one routes findings to · which briefs/
   artifacts it consumes and emits (message-match brief, experiment spec,
   negatives lexicon)
```

---

## Part 7 — Build Setup (Getting Started)

**Foundations (shared, build once — extends the Website Studio foundations list):**
1. **Ad platform layer:** Google Ads API access (developer token, OAuth, MCC per Part 4) and Meta Marketing API (Business Manager, system user) — approval lead times make this the first ticket. Thin internal service wrapping both: read metrics, stage changes, apply-with-cap, all writes logged.
2. **Metrics warehouse:** Supabase tables for daily campaign/ad-group/keyword/search-term pulls + settled-baseline computation. Monitors and audits read from here, not live API calls per run; also feeds realtor digests.
3. **Change ledger & spend-safety service:** every proposed and applied change recorded (playbook, run, entity, before/after, approver); per-account caps and cooldown state enforced centrally so no playbook can exceed rails even if its prompt fails.
4. **Approval queue extension:** the Website Studio approval plumbing gains a change-set type (list of platform mutations with plain-language rendering) alongside the page-draft type.

**Build order:**
1. Foundations above (parallel with the Vault/design-system foundations already specced).
2. **M3 Conversion Tracking Health** — the precondition everything else reads.
3. **M1 Breach Scan + M2 Performance Pulse** — read-only, immediately valuable on LIQWD's own accounts, and they exercise the metrics warehouse.
4. **A1 Negatives Engine + A6 Budget Guard** — first write-path tools; highest savings-per-effort; every safety mechanic gets proven here.
5. **L1 Campaign Launcher** (paired with the PPC Landing Page playbook from the Website Studio set — they share the message-match brief) → LIQWD's resale funnel goes live on the suite.
6. **A3, A4, A2, A5, A7, A8, L2** in descending order of impact on live spend.
7. **Agent tier packaging** (managed campaigns) once ≥60 days of internal runs prove the rails: translated digests, decision-style approvals, the monthly story report.

**Prompt drafting readiness:** with this document plus the Website Studio blueprint, every tool in the suite has enough spec to draft its system prompt under the v1.1 standard. Same defaults as before (Claude API system prompts, tool contracts against Supabase + the ad platform layer, structured JSON outputs, compliance rulebook v1 flagged for human review) — nothing further blocks drafting, starting with M1/M2/M3 and A1.

---

*Remaining sets to dissect from the source library: OTTO (on-page SEO), Content, Authority, Local, Atlas, AI Vis, Explorer. OTTO and Local are the priority next — both map directly onto the microsite/resale SEO strategy.*
