# LIQWD Playbook System — Realtor Studio & Experience Modes

**Purpose:** Two additions to the architecture, from the same insight: the playbook system shouldn't stop at SEO/ads — it should cover *everything a realtor produces*, and every agent-facing tool needs two ways in: a streamlined done-for-you path and a full-control path. This doc defines the Realtor Studio suite (the deliverables catalogue) and the Experience Mode system (Guided vs Pro), which becomes part of spec standard v1.1 for all agent-tier tools.

---

## Part 1 — Experience Modes (Guided / Pro)

### Naming
Avoid "beginner" — no realtor self-identifies as one. Recommended labels: **Guided** (default) and **Pro**. Acceptable alternates if product voice evolves: Simple/Advanced, Express/Studio. The pair to avoid: Beginner/Expert.

### The core principle: two views, one engine
Modes are **presentation layers over the same playbook spine**, never forked playbooks. Every tool still runs the same four-phase execution (preconditions → context → strategy → generation → guardrail → approval). What changes is how much of it the agent sees and touches:

- **Guided:** the strategy phase runs on defaults drawn from the Vault, Agent Brand, and house best-practice; decision points collapse to at most **three interactions** — typically *upload/pick the subject* (a listing, a topic, a date range), *pick 1 of 3* (the design flavour or angle), *confirm*. Output arrives finished, described in outcome language (leads, calls, posts scheduled), with a single approval tap.
- **Pro:** the same run exposes the strategy gate (see and edit the plan before generation), the parameter surface (targeting, variants, copy, scheduling, section order), and per-item approval instead of batch. Progress and reporting use practitioner language.

### The non-negotiable: guardrails are mode-invariant
Compliance lint (RECO/TRREB/CASL), spend caps, blast-radius caps, verified-claims-only grounding, approval checkpoints, and the change ledger are **identical in both modes**. Pro mode unlocks more *control*, never more *risk*. An agent in Pro can change the headline; they cannot disable the lint, exceed the caps, or publish unapproved. This is stated in the UI ("Pro mode: more control, same protections") so the boundary is a feature, not a discovery.

### Mechanics
- **Mode is per-run selectable, per-account defaulted, and remembered.** New agents land in Guided; the toggle is visible, switching is instant, and a run started in Guided can be "opened in Pro" at the approval step (see the details, adjust, re-approve) — the upgrade path doubles as education.
- **A third path sits above both: "Have LIQWD do it."** Every Guided flow ends with an escalation offer into the managed service — the mode system is also the top of the managed-service funnel.
- **Spec impact:** spec standard v1.1 gains a section per agent-tier playbook: *Guided contract* (the ≤3 interactions, in order, with defaults for everything else) and *Pro surface* (which phases/parameters unlock). Admin tools are exempt — admin view is Pro by definition.
- **Copy discipline:** Guided-mode microcopy never uses SEO/ads jargon; Pro mode may. Same rule already established for agent-tier reporting, now applied to the run experience itself.

### Worked example — Listing Marketing Kit (R2) in each mode
*Guided:* "Which listing?" (pick from LIQWD or paste address + upload photos) → "Pick a look" (three branded previews using their actual photos) → "Here's your kit" (graphics, flyer, feature sheet, email, landing page, video script — one approval). Total agent effort: ~90 seconds.
*Pro:* same intake → editable strategy card (angle, headline options, which pieces to include, CTA choice, schedule) → per-piece review with regeneration controls → approve individually or in bulk.

---

## Part 2 — Realtor Studio (the deliverables catalogue)

A new suite (R-prefix) covering the non-SEO, non-ads deliverables a working realtor actually needs. Same foundations as everything else: Vault-grounded, Agent Brand-styled (the three-template design system + Match/Brand-first modes), staged through the approval queue, RECO/TRREB lint on every output. Consolidated to eight tools:

- **R1 · Listing Presentation Builder.** The listing-appointment deck: market snapshot from LIQWD's Market Vault, neighbourhood stats, pricing-strategy framing, the agent's bio/proof block (Realtor Vault E-E-A-T: verified reviews, transactions, neighbourhood expertise), and — the differentiator — a "here's the marketing machine your listing gets" section showcasing the LIQWD toolkit itself. Output: branded deck + leave-behind PDF. Guided: pick property type + neighbourhood + look → done. *Compliance note: market-snapshot framing must avoid appraisal/valuation claims; sold-data usage follows TRREB display rules (encode in Compliance Vault).*
- **R2 · Listing Marketing Kit.** One listing in → full kit out: just-listed/just-sold/open-house graphics (per-platform sizes), feature sheet, print flyer, email blast, single-listing landing page (routes through the existing page builders), and a listing video script. The Guided-mode flagship — "upload this and it's done." Usage-rights attestation on photos (already in Agent Brand) enforced here hardest.
- **R3 · Social Engine.** Cross-platform content system: Instagram (posts, carousels, reel scripts), Facebook, LinkedIn, TikTok/Shorts scripts, X. Extends G5's rotation-framework pattern beyond GBP: a 4–8-week calendar rotating listings, market updates, neighbourhood spotlights, testimonials, and personal-brand posts; platform-native formatting; media-library-first with flavour-consistent generation as approved fallback; cross-posting through the social API layer already planned. Trigger boundaries per G5 (calendar tool, not single-post tool — single posts are a Guided quick action inside it).
- **R4 · Guides & Lead Magnets.** Branded PDFs that earn contact info: first-time buyer guide, **pre-construction buyer guide and assignment guide** (LIQWD's home turf — these double as platform content), seller prep checklist, neighbourhood guides (fed by G7's briefs). Wired to landing pages + forms from the Website Studio suite.
- **R5 · Newsletter & Nurture.** Monthly market newsletter (auto-drafted from R6 data), buyer/seller drip sequences, past-client nurture. **CASL discipline distinct from P2's:** these send to the agent's own lists — consent basis recorded per contact, unsubscribe honored at the infrastructure layer, suppression shared with the outreach system.
- **R6 · Market Report / Neighbourhood Snapshot.** The data engine behind R1, R5, and half of R3: monthly neighbourhood-level market summaries from the Market Vault (+ licensed board data where available — data-licensing check is a foundation task). Doubles as public Trophy Content for the V-suite and P1 pitches. Not-an-appraisal framing enforced by lint.
- **R7 · Video Script Studio.** Listing tours, agent intro, neighbourhood tours, "market minute" scripts — shot lists + captions + hook variants, sized per platform, voice-matched to Agent Brand. (Scripts and shot lists only; production stays human.)
- **R8 · Profile & Bio Studio.** The agent's identity kit: bio (short/long/platform variants), headshot guidance, consistent profile copy pushed toward GBP (G2), social profiles, and the E-E-A-T block on their pages. Runs at onboarding; feeds everything else. This is also where the Realtor Vault gets populated — R8 is secretly the onboarding wizard.

### Suite notes
- **Build order:** R8 first (it fills the Vault everything depends on) → R2 (the wow moment; strongest Guided-mode demo) → R3 (weekly visible value) → R6 (unlocks R1/R5 and platform content) → R1 → R4/R5/R7.
- **Tier:** all eight are agent-tier by design (admin-operable for managed service). This suite plus Local (G) plus managed campaigns is the full realtor offer: *your listings marketed, your socials fed, your Google presence run, your ads managed — one monthly story.*
- **Cross-suite wiring:** R2 landing pages → Website Studio builders + O3 indexing · R3 ↔ G5 (one calendar, GBP is one channel) · R6 → R1/R5/V-suite/P1 · R8 → Realtor Vault → literally everything · all leads → resale funnel attribution.
- **Compliance additions to the rulebook:** brokerage identification on all advertising materials (RECO), accurate-claims lint on presentation stats, TRREB sold-data display rules, photo usage rights (enforced via Agent Brand attestations), not-an-appraisal framing on market content, CASL consent classes for owned-list sending.

---

*This doc extends the seven-set blueprint series. Running totals with Realtor Studio: 40 → 48 LIQWD tools. Experience Modes amend spec standard v1.1 for all agent-tier tools. Remaining source sets to dissect: Content, Atlas.*
