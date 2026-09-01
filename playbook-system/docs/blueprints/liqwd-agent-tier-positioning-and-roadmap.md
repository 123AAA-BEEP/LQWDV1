# LIQWD Playbook System — Agent-Tier Positioning, Free/Paid Model & Roadmap

**Source: founder direction, 2026-08-29.** This document is authoritative for
how the agent tier is packaged, worded, and sequenced. It amends the
Experience Modes doc (Guided/Pro stays the run-level mechanic; this defines
the tier-level offer around it) and binds every agent-facing tool's card copy
and onboarding placement. The source screenshots gave us the general concept;
this is the LIQWD delivery: **simple, easy to ingest, positioned as easy wins
realtors understand.**

---

## Part 1 — The business model: Free is the funnel, Paid is the upgrade

**Free tier — "branded through LIQWD."** Anything a realtor does on the free
tier carries LIQWD branding and lives on LIQWD property:

- Their own website, set up through LIQWD (on a LIQWD-owned address — the
  existing `liqwd.ca/@handle` vanity surface is the natural home), in their
  chosen flavour, with their Agent Brand assets — but visibly Powered by
  LIQWD.
- Free-tier content and pages route leads and traffic through LIQWD
  attribution.
- **What LIQWD gets:** traffic, user growth, agents actively pushing
  LIQWD-branded surfaces into their own networks. Every free agent is a
  distribution channel.

**Paid tier — "make it yours + turn on leads."**

- Buy their own domain (the microsite domain rail already built — purchase,
  attach, DNS, all automated).
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
   review"), never the mechanism. The playbook's internal name (W1, G2…)
   never appears in agent UX.
2. **One sentence, one number.** Card copy: one plain sentence on what they
   get + one concrete anchor (time-to-value or effort: "ready in 10
   minutes", "about 90 seconds of your time", "runs weekly on its own").
3. **Three-line anatomy, max:** What you get → What it costs you (time/money,
   free vs paid labeled) → What happens next. Nothing else above the fold.
4. **Jargon ban** (extends the Smart Ads translation rules): SEO, CTR, CPA,
   match types, schema, indexing never appear in agent UX. Currency is leads,
   calls, dollars, and "showing up when people search."
5. **Easy-win framing.** Every module leads with the fastest visible result
   it can honestly promise. If a module can't show the agent something
   within its first run, it isn't ready for the agent tier.
6. **≤3 interactions in Guided mode** (unchanged from Experience Modes) and
   the "Have LIQWD do it" escalation on every flow.

## Part 3 — The roadmap: a guided path with light guardrails

Agents follow a simple, visible journey. Guardrails are **recommendations
with warnings, not locks** — except where a step genuinely cannot work
without another (those few stay hard, and say why in plain language).

**The path (free steps first, paid steps clearly marked):**

1. **Set up your brand** (R8 — the onboarding wizard: photo, logo, bio,
   brokerage details). *Everything else uses this; the completeness meter is
   the progress bar.*
2. **Get your website — free** (LIQWD-branded personal page on liqwd.ca).
   *The first visible win; minutes from signup.*
3. **Show up on Google** (GBP connect → profile fix-up → weekly posts).
4. **Market a listing / feed your socials** (R2 listing kit, R3 social
   calendar). *The recurring visible value.*
5. **Go pro — paid:** your own domain (bought and wired automatically).
6. **Turn on leads — paid:** landing page first, then ads. *This ordering is
   a HARD guardrail: no campaign launches without an approved landing page
   and working lead tracking — "ads with nowhere good to send people burn
   money", stated exactly that plainly in the UI.*
7. **Watch it work:** the monthly story — what you spent, what you got, what
   we fixed, what's next.

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

- The **vanity-handle site** (`liqwd.ca/@handle`) is the free-tier website
  target; the **microsite/domain rail** (already live) is the paid-tier
  website target. Same page builders, same flavours, same approval queue —
  branding and domain differ. This reuse is the whole point: the free tier
  costs LIQWD almost nothing marginal.
- Card copy for every agent-facing tool gets rewritten against Part 2 before
  the agent tier launches; the blueprints' internal names stay internal.
- The roadmap is data, not hardcode: a `roadmap_steps` structure (step,
  tier, prerequisites hard/soft, benefit copy) so re-ordering is an admin
  edit — spec it in migrations-spec when the agent-tier UI build starts.
