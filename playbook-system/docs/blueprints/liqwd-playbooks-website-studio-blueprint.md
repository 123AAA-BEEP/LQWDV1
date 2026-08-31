# LIQWD Playbook System — Website Studio Set: Deep Review & Adaptation Blueprint

**Purpose:** Dissect the three Search Atlas Website Studio playbooks (Local Business Lead Page, PPC Landing Page, High-Converting Website), extract the design pattern worth copying, identify what they get wrong or leave out, and spec the LIQWD-native equivalents to a "power agent employee" standard.

**Status:** Reference blueprint. Nothing here is built yet. This is the document to hand to Claude Code when execution starts.

---

## Part 1 — The Template Anatomy (What to Copy)

Before reviewing the individual playbooks, here is the structural pattern all three share. This is the real asset in the screenshots — the *shape* of a well-designed agentic playbook, independent of content.

### 1.1 The card layer (how a playbook is sold to its operator)

Every playbook presents four things before anyone launches it:

1. **Name** — `Category — Verb-first outcome` ("Website Studio — Build High-Converting Website"). The name states what you *get*, not what the system *does*.
2. **One-paragraph description** — plain language, states inputs, mechanism, and what it explicitly does NOT require ("without requiring an attached ad campaign" is doing real work — it removes a perceived prerequisite that would stop someone from launching).
3. **Expected Benefit (What You'll Get)** — 3–4 checkmarked outcomes. Note the mix: at least one is a *conversion* claim, at least one is a *safety* claim ("Prevents false information by relying strictly on verified Brand Vault assets"). Selling safety as a benefit is smart — it builds trust in the automation itself.
4. **Two affordances only** — Schedule and Launch/Use Template. No configuration soup on the card. Configuration happens inside the run, via the "resolve missing inputs" step.

**LIQWD rule:** every playbook card follows this exact format. Name, one paragraph, 3–4 outcome checks (one of which is always a grounding/safety guarantee), Schedule + Launch. For agent-facing playbooks, add one line: *Executed by* (persona) and *Approval required before anything publishes* — realtors need to see the human-in-the-loop guarantee before they trust it.

### 1.2 The execution layer (the DAG pattern)

All three playbooks run the same four-phase spine, visualized as a step graph:

```
PHASE 1 — CONTEXT        Pull Vault → Resolve/Confirm missing inputs
PHASE 2 — STRATEGY       Decide intent/architecture BEFORE generating anything
PHASE 3 — GENERATION     Draft content/pages, incorporate verified proof
PHASE 4 — REVIEW & GATE  Verify guardrails → Approval checkpoint → (deliver)
```

Five design decisions inside this spine are worth adopting verbatim:

- **Vault-first, always.** Every playbook's first node is "Pull Brand Vault Context." Nothing is generated from a cold prompt. The entire quality architecture rests on a single source of truth for identity, voice, assets, and proof.
- **Missing inputs are resolved interactively, not guessed.** "Request Missing Inputs" / "Resolve Missing Info" is a first-class step. The agent asks; it never invents. This is the single biggest hallucination defense in the whole system.
- **Strategy is a separate phase from generation.** Conversion intent, coverage area, sitemap, CTA hierarchy, message-match — all decided and (in the website playbook) *approved* before a word of page copy is drafted. Prevents the classic failure of generating beautiful pages built on an unexamined structure.
- **Guardrail verification is an explicit named node**, not an implicit hope. "Verify Guardrails — ensure no invented reviews, addresses, or licenses are included." A dedicated check step that runs after generation and before the approval gate.
- **Approval checkpoint is the terminal gate.** Nothing ships without human sign-off. The High-Converting Website playbook goes further with a *two-stage* approval (architecture approved first, then final delivery) — the right pattern for anything with large output volume.

**LIQWD rule:** the four-phase spine (Context → Strategy → Generation → Review & Gate) is mandatory for every playbook. Any playbook whose output volume is large (multi-page, multi-asset) uses two-stage approval. This maps 1:1 onto the existing draft-then-human-approve-then-publish workflow already in the LIQWD pipeline — the playbooks formalize it per-tool.

### 1.3 What the template leaves out (LIQWD's upgrade surface)

Even the best of these playbooks stop at "approved." A power-agent employee doesn't stop there. Missing from all three, to be added in every LIQWD equivalent:

- **No post-publish loop.** Nothing measures whether the page it built actually converts, and nothing suggests the follow-up action. LIQWD playbooks end with a defined *post-run block*: what gets logged, which metric defines success, and which playbook is the natural next step ("Page live → run Indexing — Submit New URLs").
- **No SEO layer in the page builders.** No schema step, no internal-linking step, no thin-content check. Fatal omission for LIQWD given the scaled-content-abuse constraint — a page that publishes thin is a ranking-survival risk, not a cosmetic one.
- **No conversion measurement wiring.** Pages are built with CTAs but no tracking spec (GA4 events, Google Ads / Meta conversion tags, call tracking). A lead page without attribution is a lead page LIQWD can't learn from — and attribution is the strategic asset.
- **No compliance layer.** Search Atlas serves generic local businesses. LIQWD serves RECO-registered realtors, where advertising rules are law, not style: registrant name as registered, brokerage identification on advertising, no misleading claims, and TRREB rules on listing data. Compliance is a named guardrail node in every agent-facing playbook, not a footnote.
- **No design system integration.** "Apply Visual Direction" is a vibe ("modern, premium, high-trust"), not a system. LIQWD replaces it with the flavour picker (Part 4).
- **No explicit scope contract.** The Smart Ads playbooks gesture at this ("read-only," "proposes but never applies") but the Website Studio ones don't state what they will and won't touch. Every LIQWD playbook declares reads / stages / never-touches up front.

---

## Part 2 — Playbook-by-Playbook Deep Review

### 2.1 Website Studio — Build Local Business Lead Page

**Their structure (8 nodes, 4 phases):**

| Phase | Nodes |
|---|---|
| 1 — Gather Inputs | Pull Brand Vault Context (name, service area, voice, colors, trust proof) · Confirm Required Fields (primary service, location, main CTA) |
| 2 — Local Strategy | Align Conversion Intent (calls / quotes / bookings) · Define Coverage Area (physical-address map vs service-area block) |
| 3 — Page Generation | Build Local Hero & CTA (high-converting hero, direct fast contact path) · Structure Content Sections (service details, why-choose-us, reviews, form, FAQs) |
| 4 — Review & Approval | Verify Guardrails (no invented reviews, addresses, or licenses) · Approval Checkpoint (present design + structure for client approval before publishing) |

**What's genuinely good:**

- The **coverage-area fork** (storefront with map vs service-area block) is a real decision that changes page structure, schema type, and GBP alignment. They made it an explicit strategy node rather than a template default.
- **Conversion intent as a single choice** — the page is built around *one* primary action (call, quote, or booking), not a buffet of CTAs. This is correct conversion doctrine and worth enforcing hard.
- The guardrail node names the three highest-liability hallucinations for a local page: **reviews, addresses, licenses**. For realtors, "licenses" becomes RECO registration — inventing or misstating one is a regulatory event, so this guardrail graduates from quality control to compliance control.

**Weaknesses / gaps:**

- Section order in Phase 3 is fixed and un-argued — no reasoning about which trust element leads for which audience.
- No schema.org output (`LocalBusiness` / `RealEstateAgent`), no NAP-consistency check, no page-speed constraint, no tracking wiring, no post-publish indexing handoff.
- "Client approval" assumes an agency operator; LIQWD's version needs role-aware approval (admin approves admin runs; realtor approves their own page; LIQWD retains a publish-veto on compliance failures).

**LIQWD adaptation spec — `Realtor Pages — Build Local Presence Page`**

- **Tier:** Agent-facing (flagship of the realtor tool tier). Admin can run on behalf of any realtor.
- **Persona:** Local Conversion Specialist — direct-response local marketer who thinks in one-CTA pages and trust hierarchies.
- **Scope contract:** *Reads:* realtor Vault profile, verified review sources, neighbourhood data, flavour tokens. *Stages:* one page draft + schema + tracking plan into the approval queue. *Never touches:* live pages, DNS, ad spend, any other realtor's data.
- **Inputs resolved at run time:** target neighbourhood(s) (from LIQWD neighbourhood objects, Mississauga-first), primary conversion intent (home-valuation request / consult booking / direct call), flavour choice (Part 4), and any Vault fields missing (headshot, brokerage, review source).
- **Strategy phase adds:** neighbourhood-proof selection — which *verifiable* local signals this page can claim (transactions in area only if provable, market data from LIQWD's own datasets, Walk Score / transit / schools via the server-rendered API integrations already specced). Nothing local is claimed that isn't sourced.
- **Generation phase adds:** fixed E-E-A-T attribution block (name as registered, RECO number, brokerage — position locked across flavours) · `RealEstateAgent` + `Service`/`FAQPage` schema · conversion tracking spec (GA4 event map + platform tags) · thin-content gate: the draft must clear a substance threshold (unique local data density, not word count) or the run stops and reports *why* instead of staging a thin page.
- **Guardrail node (expanded):** no invented reviews, sales claims, awards, or license details · RECO advertising-rule lint (brokerage identification present, registrant name correct, no superlative claims without substantiation) · no fabricated market statistics — every number carries a source field.
- **Approval gate:** realtor sees a live preview in their chosen flavour + a plain-language summary of every claim the page makes and its source. Compliance failures hard-block publish regardless of realtor approval.
- **Post-run block:** log run + claims manifest to Supabase · on publish, auto-suggest `Indexing — Submit New URLs` · success metric: primary-CTA conversion rate; page enters a 30-day review queue.

---

### 2.2 Website Studio — Build PPC Landing Page

**Their structure (8 nodes, 4 phases):**

| Phase | Nodes |
|---|---|
| 1 — Context & Inputs | Pull Brand Vault Context (voice, colors, logo, services, audience, assets) · Request Missing Inputs (offer, product/service, intent, primary CTA) |
| 2 — Intent & Strategy | Define Intent Equivalents (search intent → headline promise → value proposition → conversion action) · Build Message Match Strategy (align hero headline, offer, CTA, and sections around a single visitor intent) |
| 3 — Page Generation | Generate High-Conversion Page (hero, problem/solution, benefit blocks, short conversion path) · Incorporate Real Proof & FAQs (verifiable testimonials, trust cues, objection-handling FAQs) |
| 4 — Design & Approval | Apply Mobile-First Design (high-trust layout, minimal navigation for scannability) · Approval Checkpoint (draft presented for review prior to publish) |

**What's genuinely good:**

- This is the strongest playbook of the three, because Phase 2 encodes actual PPC doctrine rather than page-building generics. **Intent Equivalents** is the search-intent → headline-promise → conversion-action chain that determines Quality Score and CVR; **Message Match** enforces the ad-to-page scent trail around a *single* visitor intent. Most human-built landing pages fail exactly here.
- **"Without requiring an attached ad campaign"** decouples page building from platform connection — the page can be built, approved, and waiting before a dollar is spent. Keep this property.
- **Minimal navigation** as an explicit design rule — correct for PPC (leaks kill paid CVR), and a genuine structural difference from the Local Presence Page, which wants some navigation for SEO.

**Weaknesses / gaps:**

- Single page out, no variant. For paid traffic this wastes the cheapest experiment available — headline/hero variants against the same intent.
- No conversion-tracking setup, which for PPC is disqualifying: without the tag plan, Smart-Bidding-style optimization downstream has nothing to learn from.
- No speed budget. Paid mobile traffic punishes slow pages directly in both CVR and (on Google) ad rank.
- "Verifiable testimonials" is asserted but not enforced by a named guardrail node the way the Local playbook enforces reviews.

**LIQWD adaptation spec — `Paid Media — Build PPC Landing Page`**

- **Tier:** Agent-facing (paired with the ad-launch playbooks in the Smart-Ads-equivalent set). This is the connective tissue of the resale hybrid funnel: PPC on underpriced agent-selection terms → this page.
- **Persona:** Direct Response Specialist — performance marketer who optimizes for message match, page speed, and single-action conversion.
- **Scope contract:** *Reads:* realtor Vault, keyword intelligence (both intent buckets from the resale keyword analysis: agent-selection and direct buyer/seller intent), flavour tokens. *Stages:* landing page draft + one challenger variant + tracking spec. *Never touches:* live campaigns, budgets, bids, live pages.
- **Inputs resolved at run time:** which intent bucket and keyword cluster this page serves (the answer changes everything downstream) · the offer (free home valuation / buyer consult / agent match) · flavour · destination campaign context if one exists (optional by design — preserve the decoupling).
- **Strategy phase:** keep Intent Equivalents and Message Match exactly as designed — they are the crown jewels — but ground them in LIQWD's actual keyword data rather than operator free-text. Output of this phase is a one-screen *message-match brief* (keyword cluster → headline promise → offer → CTA) that becomes the shared contract with the ad-copy playbook, so ads and page are generated from the same brief and can never drift apart.
- **Generation phase adds:** control + one challenger variant (same layout skeleton, different headline/hero angle) · conversion tracking spec (GA4 + Google Ads / Meta pixel event map, call tracking if intent = call) · performance budget (target LCP, image weight caps, no render-blocking third parties) enforced at build, not audited after · proof rules: testimonials/stats only from verified Vault sources; if none exist, the page uses structural trust (RECO verification, brokerage, process transparency) instead of fabricating social proof.
- **Guardrail node:** message-match self-audit (does the H1 restate the keyword promise? is there exactly one conversion action?) · RECO advertising lint · fabricated-proof check · speed-budget check.
- **Approval gate:** realtor reviews both variants side-by-side in their flavour, plus the message-match brief in plain language ("Someone searching *X* will land here and be asked to *Y*").
- **Post-run block:** log page + brief + variant pair · success metric: CVR by variant; auto-suggest the winner promotion after significance · natural next step: the campaign-launch playbook, pre-loaded with the same brief.

---

### 2.3 Website Studio — Build High-Converting Website

**Their structure (10 nodes, 5 phases):**

| Phase | Nodes |
|---|---|
| 1 — Context Gathering | Validate Project (active project selected) · Pull Brand Vault Data (name, offering, audience, goals) · Resolve Missing Info (colors, CTAs, integration needs) |
| 2 — Architecture & Strategy | Build Sitemap (navigation structure from service model) · Define Conversion Path (primary/secondary CTA hierarchy and placement strategy) |
| 3 — Content & Page Generation | Draft Homepage Framework (hero, value prop, social proof, core services) · Draft Core Pages (About, Services, Contact, supporting) |
| 4 — Design & Responsiveness | Apply Visual Direction (modern, premium, high-trust aesthetic aligned with brand) · Mobile-First Optimization (responsive layout and structure) |
| 5 — Approval & Handoff | Present Architecture & Messaging (approval on sitemap, messaging framework, visual summary) · Deliver & Verify (finalize assets, verify CTA logic, check Brand Vault alignment) |

**What's genuinely good:**

- **Validate Project as node zero** — an environment-precondition check before any work. Trivial, and missing from most agent workflows. Every LIQWD playbook gets an equivalent (realtor profile complete enough? neighbourhood data present? approval queue reachable?) that fails fast with a human-readable reason.
- **Architecture before content, CTA hierarchy before pages.** The sitemap and conversion path are decided as strategy, then pages are drafted *into* that structure. This is the only defensible sequence for multi-page generation.
- **Two-gate approval** — architecture & messaging approved separately from final delivery. The reviewer approves the skeleton when it's cheap to change, not after 15 pages exist.
- **Deliver & Verify** re-checks Vault alignment and CTA logic *after* generation — a closing consistency pass, acknowledging that long generation runs drift.

**Weaknesses / gaps:**

- The sitemap is derived from the "service model" with no keyword input — for LIQWD this is backwards. Site architecture *is* SEO architecture: the sitemap should be drafted from keyword-cluster mapping (each core page owns a cluster) with internal-linking logic specified alongside it.
- "Apply Visual Direction" is the weakest node in all three playbooks — an adjective list, not a system. Replaced entirely by the flavour token system.
- No per-page thin-content gate; a 10-page generation run is exactly where thin pages slip through.
- No performance/CWV requirement, no analytics plan, no staging-vs-production handoff definition ("Deliver" to where?).

**LIQWD adaptation spec — split into two, because the monolith serves two different masters:**

**(a) `Web Properties — Build Project Microsite` (Admin-only).** The direct application of this playbook to the existing microsite strategy: standalone lead-capture assets for project-specific searches, explicitly *not* link-equity vehicles. Adaptations: sitemap drafted from the project's keyword map · every page grounded in the verified project record (Altus-seeded, enrichment-approved fields only — AI drafts stay in `description_ai_draft` semantics: nothing publishes unapproved) · per-page thin-content gate with the server-rendered data integrations (Walk Score, transit, schools, StatsCan/CMHC) as the substance backbone · schema per page type · two-gate approval (architecture, then content) · performance budget · handoff = staged build + submit-URLs playbook queued.

**(b) `Realtor Pages — Build Personal Site` (Agent-facing, later phase).** The realtor-brand version: small fixed sitemap (Home, About, Service Areas, Reviews, Contact + valuation funnel), flavour-driven, Vault-grounded, RECO-linted. Deliberately *less* configurable than the admin version — for the agent tier, constraint is the feature. Sequenced after the two page builders prove the flavour system and approval flow.

---

## Part 3 — The LIQWD Playbook Spec Standard

Every playbook — this set and everything adapted from the OTTO and Smart Ads libraries later — ships against this template. This is the "power agent employee" contract: each playbook is a specialist hire with a job description, authority limits, and a manager sign-off.

```
1. IDENTITY
   Name:            Category — Verb-first outcome
   Tier:            Admin-only | Agent-facing | Both
   Persona:         The specialist this playbook embodies (drives voice & judgment style)
   Card copy:       1-paragraph description + 3–4 Expected Benefits
                    (≥1 conversion claim, ≥1 grounding/safety claim)

2. SCOPE CONTRACT
   Reads:           exact Supabase tables/fields, Vault objects, external data
   Stages:          what lands in the approval queue (and only there)
   Never touches:   live assets, spend, other users' data — enumerated, not implied

3. GROUNDING RULES
   Single source of truth per fact type; every generated claim carries a source;
   missing data → ask or omit, never invent; thin-output gate where applicable

4. EXECUTION SPINE (four phases, mandatory)
   0  Preconditions   — validate environment, fail fast with readable reason
   1  Context         — pull Vault → resolve missing inputs interactively
   2  Strategy        — decisions before drafting (approved separately if output is large)
   3  Generation      — draft + verified proof + schema/tracking/perf as applicable
   4  Review & Gate   — named guardrail node (incl. RECO/TRREB lint for realtor-facing
                        output) → approval checkpoint (compliance failures hard-block)

5. FLAVOUR HOOK (visual-output playbooks only)
   Consumes one flavour token set; conversion architecture invariant across flavours

6. POST-RUN BLOCK
   Logged artifacts · success metric · natural next playbook · review-cycle entry
```

**Quality bar enforcement:** a playbook that can't fill in every section isn't underspecified — it isn't done. The vague Search Atlas descriptions in the earlier screenshots are what this template exists to prevent.

---

## Part 4 — The Design System (Three House Templates + Brand Integration)

("Vanilla/strawberry/chocolate" is shorthand for the picking experience, not literal palettes — three distinct house designs, e.g. Modern Minimal / Warm Editorial / Bold Premium.)

- **Three token sets, one component library.** Each house template = a design-token file (palette, type pair, spacing scale, imagery treatment, radius/shadow rules) applied over identical components. Adding a fourth later is a new token file, not a new template.
- **Invariant conversion architecture.** Section order, form placement, CTA logic, schema, and the E-E-A-T attribution block do not move between templates. Templates change skin, never funnel — so performance comparisons stay clean.
- **Two brand-integration modes, chosen per agent:**
  - **Match mode (default when Agent Brand is populated):** the system reads the agent's brand assets — logo palette, existing fonts, overall tone — and routes them to the closest house template, applying their brand cues into that template's accent slots (with contrast checks). The picker still shows all three previews, but their best-match is pre-selected and labelled as such.
  - **Brand-first mode:** skip the house templates and generate the token set *from* the agent's brand — extract the palette from their logo/assets, map their fonts to the closest high-quality web-safe/hosted equivalents, and run the whole page/email/post generation on that derived token set. Same component library and invariant funnel underneath, so even fully brand-driven output can't break the conversion architecture.
- **Identity overlay.** Headshot, name-as-registered, RECO number, brokerage slot into fixed positions in every template and mode.
- **Picker UX.** Live previews with the realtor's own content injected — never abstract swatches.

**Build note:** the token system (three house files + the brand-derivation function for Brand-first mode) is a shared dependency of all three playbooks — build it once, first, in the Next.js stack.

---

## Part 5 — Prerequisite: The LIQWD Vault

The single deepest lesson from this template set: **every quality guarantee Search Atlas makes traces back to Brand Vault.** "Prevents false information," "perfect brand alignment," "no hallucinated claims" — all one mechanism: generation is only allowed to draw from a verified asset store.

LIQWD's playbooks are only as good as LIQWD's vault. Before building playbook #1, formalize it:

- **Realtor Vault** (per agent): name as registered, RECO number, brokerage, service neighbourhoods, verified review sources, credential set. Field-level verified/unverified status — playbooks may only cite verified fields. Its user-facing surface is the **Agent Brand section** (5.1 below).
- **Market Vault** (LIQWD-owned): project records (Altus-seeded, approval-gated), neighbourhood objects, market datasets, and the server-rendered third-party integrations. Every stat a playbook can cite lives here with a source.
- **Compliance Vault**: the RECO/TRREB advertising rule set encoded as lintable checks, versioned, so guardrail nodes reference one maintained rulebook instead of per-playbook prompt fragments.

This is mostly formalization of tables that already exist — but the *verified-flag discipline* and the compliance rulebook are new, and they're what make "highest level of skill" enforceable rather than aspirational.

### 5.1 Agent Brand (the realtor-facing vault surface)

The Agent Brand section is where realtors upload and manage everything the playbooks apply on their behalf — logos, headshots, imagery, colours, voice. It is the per-agent equivalent of Search Atlas's Brand Vault, and every "Pull Vault Context" node reads from it. One upload, applied to every page, email, social post, and ad the system generates for that agent.

**Contents:**

- **Identity assets:** personal logo (primary + variants), headshot(s), team photo, brokerage logo. Brokerage logo and name-as-registered are verified against RECO registration here — so correct brokerage identification propagates to every output for free.
- **Image library:** additional photos the agent wants in rotation (community shots, office, lifestyle). Each upload requires a usage-rights attestation ("I own or have licensed this image") — listing photography is a copyright minefield (photographers/brokerages typically hold rights), and the attestation protects both agent and LIQWD.
- **Brand colours:** primary / secondary / accent, entered as swatches or pulled from an uploaded logo.
- **Voice:** tagline, short bio, email sign-off, tone preference (professional / warm / bold — mapped loosely to flavours as a default suggestion, not a lock).

**Design rules:**

- **Constrained colour injection.** Flavours own the design system; agent brand colours inject only into designated accent slots (CTA, links, section accents), with automatic WCAG contrast checking. A brand colour that fails contrast against the chosen flavour falls back to the flavour default, with a plain-language explanation. Agents never override structural tokens — this is what keeps agent-branded output from breaking the funnel or the aesthetic.
- **Automatic asset hygiene pipeline.** On upload: background removal (logos), smart crops generated per surface (page hero, email header, social square 1:1, story 9:16, ad sizes), compression and format conversion, auto-generated alt text. One raw upload → a complete derived asset set. This is the mechanism that makes "directly applied everywhere" true.
- **Completeness meter as playbook gate.** The brand profile shows percent-complete, and each playbook's precondition node checks the specific fields it needs ("Build Local Presence Page needs your headshot and brokerage logo — you're two uploads away"). Vault completion becomes onboarding motivation rather than an abandoned form, and no playbook ever runs on a half-empty brand.
- **Versioning.** Asset swaps (new headshot, rebrand) version rather than overwrite, so published pages can be batch-refreshed deliberately instead of mutating silently.

**Build note:** Agent Brand joins the flavour system and approval-queue plumbing in the *foundations* layer of the build order (Part 6, step 1) — the page-builder playbooks consume it from day one.

---

## Part 6 — Build Order

1. **Foundations first:** LIQWD Vault formalization (including the Agent Brand section and its asset pipeline) + flavour token system + approval-queue plumbing. Everything else consumes these.
2. **`Paid Media — Build PPC Landing Page`** — first playbook built. Best-designed source template, directly serves the resale hybrid funnel's paid leg, produces the message-match brief that the future ad-launch playbooks will consume, and is the flagship of the agent-facing tier.
3. **`Realtor Pages — Build Local Presence Page`** — second. Reuses ~70% of the first build (flavours, Vault, guardrails, approval), adds the SEO/schema/neighbourhood-proof layer that then generalizes to everything else.
4. **`Web Properties — Build Project Microsite`** (admin) — third. Highest output volume, so it goes last in this set, once the thin-content gate and two-stage approval are proven on smaller runs.
5. **`Realtor Pages — Build Personal Site`** — deferred to the next wave, alongside the Smart-Ads-equivalent adaptations.

---

*Next document in this series: the same deep-review treatment for the Smart Ads set (24 playbooks — triage into admin-only / agent-eligible / skip, then full specs for the agent-eligible ads & lead-gen subset).*
