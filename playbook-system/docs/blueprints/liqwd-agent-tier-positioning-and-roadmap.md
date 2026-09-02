# LIQWD Playbook System — Agent-Tier Positioning, Free/Paid Model & Roadmap

**Source: founder direction, 2026-08-29.** This document is authoritative for
how the agent tier is packaged, worded, and sequenced. It amends the
Experience Modes doc (Guided/Pro stays the run-level mechanic; this defines
the tier-level offer around it) and binds every agent-facing tool's card copy
and onboarding placement. The source screenshots gave us the general concept;
this is the LIQWD delivery: **simple, easy to ingest, positioned as easy wins
realtors understand.**

---

## Part 0 — The three-sided thesis (founder, 2026-09-01; governs all UX)

LIQWD is a **three-sided marketplace**, built in this order:

1. **The public** gets LIQWD's new-homes marketplace. Its job is to generate
   as many free leads as possible — the fuel that feeds realtor growth.
2. **Realtors** get two things: (a) the tool suite — branded website (paid;
   attach their own resale IDX/VOW feed, LIQWD hosts and manages it), lead
   pages for ANY source (resale, blanket "real estate agent" leads, not just
   new homes), the playbook modules — and (b) leads, primarily from the
   new-homes/off-market side. Goal: a ton of realtors on the platform.
3. **Developers** — the high-income phase, exploited once sides 1 and 2 are
   established: LIQWD's network of realtors across North America becomes a
   real referral channel developers pay for.

**UX consequence, binding:** the realtor interface must NOT over-state new
homes. New homes is one offering among several; the rail leads with the
daily surface and the tools, and "New homes" is named honestly as one
section. Lead pages and websites are source-agnostic. Anything that makes
the realtor panel read as "a new-homes catalog with extras" contradicts the
thesis.

## Part 1 — The business model: Free is the funnel, Paid is the upgrade

**Free tier — "branded through LIQWD."** Anything a realtor does on the free
tier carries LIQWD branding and lives on LIQWD property:

- Their own website, set up through LIQWD (on the `liqwd.ca/@yourname`
  address we already serve), **in LIQWD's look** — the agent's identity on
  it (name, photo, bio, brokerage, neighbourhoods, contact form), LIQWD's
  palette and design around it, visibly LIQWD. (Founder refinement,
  2026-09-02: the free site is on-brand with LIQWD by design. Own colours,
  own design, own domain are what the paid website is *for*. The Vault's
  `flavour` / `brand_mode` / `brand_colors` are therefore paid-tier fields.)
  It must still be good enough that agents want to share it — it is the
  distribution engine, not a demo.
- **Leads from a free agent's own page still go to that agent** — that's the
  hook that makes free worth pushing. LIQWD keeps the lead record and the
  attribution (same ownership guarantee as today: every lead is in our
  database, source-tagged). "Turn on leads" in the roadmap means *paid
  ad-generated lead volume*, not lead delivery — delivery is never paywalled.
- **What LIQWD gets:** traffic, user growth, agents actively pushing
  LIQWD-branded surfaces into their own networks. Every free agent is a
  distribution channel.

**Paid tier — "make it yours + turn on leads."**

- **A branded website that is theirs:** their colours, their design, their
  own web address, hosted and managed by LIQWD, with resale IDX/VOW as an
  add-on once the data-vendor path (migrations-spec 0004) exists. The
  **domain is included in the subscription** — never sold or priced on its
  own (founder, 2026-09-02). Wholesale cost is roughly CA$10–15/yr for a
  standard .ca/.com; the subscription prices the website, the domain rides
  along. The microsite domain machinery (buy under cap, attach apex + www,
  hourly self-heal) does the wiring automatically.
- Add money as ad spend: managed campaigns (L1 + monitors + the Smart Ads
  audits on LIQWD-managed accounts) generating leads for them.
- Premium modules as they prove out: GBP managed service, AI-visibility
  ("what does AI say about you"), etc.
- **What LIQWD gets:** revenue, with margin living in the automation.

**Either way LIQWD wins** — distribution from the free tier or revenue from
the paid tier. Every free surface carries a tasteful upgrade path; every paid
feature is the same engine with the branding swapped and spend attached.

## Part 2 — Module UX doctrine (binding on every agent-facing card)

Agents must understand the benefit of each module **in seconds**, and
executing must feel like an easy win. Rules:

1. **Benefit-first naming.** The card headline is the outcome in realtor
   language ("Get your own website", "Show up on Google Maps", "Never miss a
   review"), never the mechanism. The playbook's internal codename (W1, G2…)
   never appears in agent UX, period.
2. **One sentence, one number.** Card copy: one plain sentence on what they
   get + one concrete anchor (time-to-value or effort: "ready in 10
   minutes", "about 90 seconds of your time", "runs weekly on its own").
3. **Three-line anatomy, max:** What you get → What it costs you (time/money,
   free vs paid labeled) → What happens next. Nothing else above the fold.
4. **Jargon never leads — but it can ride along** (founder refinement,
   2026-09-01). Headlines and CTAs stay jargon-free, always. The body copy,
   subtitle, or metadata MAY name the standard industry term once ("Your
   Google Business Profile, tuned and kept fresh") — some agents know the
   vocabulary, it makes modules findable by the term they'd search, and it
   signals substance to the ones who know what a GBP is. Three layers:
   **headline** = pure benefit · **body/subtitle/meta** = one industry-term
   mention allowed · **Pro mode / expandable details** = full practitioner
   vocabulary (CTR, match types, schema…). Deep jargon never appears in the
   first two layers. Currency everywhere stays leads, calls, dollars, and
   "showing up when people search."
5. **Easy-win framing.** Every module leads with the fastest visible result
   it can honestly promise. If a module can't show the agent something
   within its first run, it isn't ready for the agent tier.
6. **≤3 interactions in Guided mode** (unchanged from Experience Modes) and
   the "Have LIQWD do it" escalation on every flow.

## Part 3 — The roadmap: a guided path with light guardrails

Agents follow a simple, visible journey. **Roadmap-step guardrails (the
"Best after" ordering) are recommendations with warnings, not locks** —
except where a step genuinely cannot work without another (those few stay
hard, and say why in plain language). To be explicit about terminology: the
*safety* guardrails defined elsewhere — compliance lint, spend caps,
approval checkpoints, paused-first publishing (Experience Modes: "guardrails
are mode-invariant") — are a different thing and are untouched by this doc.
They stay hard everywhere, always.

**The path (free steps first, paid steps clearly marked):**

1. **Set up your brand** (R8 — the onboarding wizard: photo, logo, bio,
   brokerage details). *Everything else uses this; the completeness meter is
   the progress bar.*
2. **Get your website — free** (LIQWD-branded personal page on liqwd.ca).
   *The first visible win; minutes from signup.*
3. **Show up on Google — free taste, paid service.** Free: connect your
   Google Business Profile and get a one-time fix-up report (what's wrong,
   what it's costing you). Paid: LIQWD applies the fixes and runs the weekly
   posts — that ongoing layer IS the priced GBP managed service (Local
   blueprint), so it is never bundled free.
4. **Market a listing / feed your socials** (R2 listing kit, R3 social
   calendar). *The recurring visible value.*
5. **Get your own branded website — paid:** own colours, own design, own
   domain (included in the plan, wired automatically), resale listings
   when ready.
6. **Turn on leads — paid:** landing page first, then ads on Google and
   Meta (Facebook / Instagram — Smart Ads L1 + L2). *This ordering is
   a HARD guardrail: no campaign launches without an approved landing page
   and working lead tracking — "ads with nowhere good to send people burn
   money", stated exactly that plainly in the UI.*
7. **Watch it work:** the monthly story. Paid tier: what you spent, what you
   got, what we fixed, what's next (the managed-tier retention artifact).
   Free tier gets its own honest version: what your page and posts did this
   month — never a spend report for someone who spent nothing.

**Guardrail mechanics:**

- Each step's card shows a **"Best after: …"** line when attempted out of
  order, with a one-tap "do that first" jump. Proceeding anyway is allowed on
  soft steps (a warning logs the choice).
- Hard gates (the few that stay locks): brand profile completeness for tools
  that need specific assets (the existing precondition-node pattern — "you're
  two uploads away"); landing page + tracking health before ad spend;
  compliance lint always.
- The roadmap surface doubles as the upsell surface: paid steps are visible
  (not hidden) to free agents, labeled with price framing, never nagging.

## Part 4 — Build implications

- The **`liqwd.ca/@yourname` page** is the free-tier website target; the
  **microsite/domain machinery** (already live) is the paid-tier website
  target. Same page builders, same approval queue — the free site renders
  in LIQWD's single flavour; the paid site unlocks the agent's flavours,
  palette, and domain. This reuse is the whole point: each additional free
  agent costs LIQWD almost nothing.
- Card copy for every agent-facing tool gets rewritten against Part 2 before
  the agent tier launches; the blueprints' internal names stay internal.
- The roadmap is data, not hardcode: a `roadmap_steps` structure (step,
  tier, prerequisites hard/soft, benefit copy) so re-ordering is an admin
  edit — spec it in migrations-spec when the agent-tier UI build starts.
