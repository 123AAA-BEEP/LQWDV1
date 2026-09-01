# LIQWD Compliance Rulebook — v1.0 (SKELETON — human review required)

## In plain English

This is the **list of lines the AI is never allowed to cross**, written as
individual numbered rules so every tool checks the same list instead of each
having its own vague idea of "be compliant." Two severity levels:

- **block** = the draft physically cannot publish until fixed (e.g. missing
  brokerage ID, a stat with no source, a review reply that reveals someone
  was a client).
- **warn** = flagged for a human to look at, but a human can accept it.

Rules keep their numbers forever, so when a draft gets blocked the record
says exactly which rule fired and why. When RECO or CASL guidance changes, we
update the rule text and bump the version — every tool inherits the change
instantly.

Versioned, lintable rule set. Guardrail nodes reference rule IDs; IDs are
stable forever (rules deactivate, never renumber). Severity: **block** (hard-
stops publish regardless of approval) or **warn** (surfaced, human may accept).
Machine twin: `compliance_rules` table (migrations-spec 0001 §3).

> Review note for the founder: the rule *texts* below are drafting stubs
> distilled from the blueprints. Before v1.0 is marked reviewed, each should be
> checked against the current RECO advertising guidelines, TRREB MLS rules,
> and CASL — ideally with counsel for the block-severity set.

## RECO advertising (realtor-facing output)

- **RECO-AD-1 · block** — Registrant name must appear exactly as registered
  (`realtor_vault.trade_name`, falling back to `name_as_registered`,
  verified). No nicknames in advertising.
- **RECO-AD-2 · block** — Identification block present and complete on every
  advertisement (page, ad, post, flyer, email footer): trade name · title
  (Salesperson / Broker / Broker of Record) · phone number · brokerage name ·
  brokerage address where the jurisdiction requires it · agent email.
  (Founder spec 2026-08-29.)
- **RECO-AD-3 · block** — No misleading claims; superlatives ("#1", "top
  producer") require a substantiating source in the claims manifest.
- **RECO-AD-4 · warn** — Team/trade names accompanied by registrant + brokerage
  identification per current RECO guidance.

## TRREB / listing data

- **TRREB-DATA-1 · block** — Sold data display follows current TRREB/board
  rules; no sold prices where display rights don't cover the surface.
- **TRREB-DATA-2 · block** — Listings not the agent's own are never presented
  as theirs; sourcing rules apply to any MLS-derived content.

## Claims & market content

- **CLAIM-1 · block** — Every number carries a source (`market_datasets` join
  or verified project field). No sourceless statistics, ever.
- **CLAIM-2 · block** — Not-an-appraisal framing on all market/valuation
  content ("market information, not an appraisal or opinion of value").
- **CLAIM-3 · block** — No invented reviews, awards, transactions, or
  credentials; testimonials only from verified review sources.
- **CLAIM-4 · warn** — No promises of investment returns or appreciation
  (existing editorial rule, graduated to lint).
- **CLAIM-5 · block** — Competitor references factual and neutral; comparative
  claims substantiated with disclosed criteria (Competition Act exposure).

## CASL (all commercial email)

- **CASL-1 · block** — Consent basis recorded per recipient before send
  (express, or implied via conspicuously-published-address for B2B outreach
  relevant to the recipient's role).
- **CASL-2 · block** — Sender identification block present (name, mailing
  address, contact).
- **CASL-3 · block** — Functioning unsubscribe present; suppression enforced
  at infrastructure level, honored promptly.
- **CASL-4 · block** — Suppression list is global across P2 outreach, R5
  nurture, and lead auto-send — one opt-out silences all systems.

## Privacy / conduct

- **PRIV-1 · block** — Review replies never confirm someone was a client nor
  reveal transaction details.
- **PRIV-2 · block** — ≤3-star review responses are always human-approved;
  no automated replies to negative reviews.
- **PRIV-3 · warn** — Sensitive inbound (legal, complaint, refund) auto-
  escalates to a human (G6/O4 ESCALATE disposition).

## Photo & asset rights

- **PHOTO-1 · block** — Library images require a usage-rights attestation
  (`agent_brand_assets.rights_attested_at`) before any generated output may
  include them.
- **PHOTO-2 · warn** — Builder renderings labelled artist's concept / E.&O.E.
  where shown (existing microsite footer rule, generalized).

## Platform-integrity deviations (final — do not relitigate, per README)

- **PLAT-1 · block** — No deployed link networks, cloud stacks, or paid
  placements. Earned channels only.
- **PLAT-2 · block** — No gray-area indexing APIs or paid indexer services;
  compliant stack only (sitemaps, GSC, IndexNow).
- **PLAT-3 · block** — No unsupervised publishing; approval queue is the only
  path to public surfaces. Campaigns publish paused.
