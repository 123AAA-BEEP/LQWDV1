# Campaign plan — Agent acquisition on Google (conquest + category), Sept 2026

**Status: PLAN, for founder approval. Nothing is live. Launch is paused-first per the Smart Ads invariants.**
Owner: LIQWD's own ad account (the Smart Ads blueprint's Phase 1: LIQWD is
the first client of its own suite). Currency CAD unless noted.

---

## 0 · Here or Search Atlas? (the founder's question)

**Intel: here.** The keyword portfolio, competitor map, negatives list,
ad copy, and the campaign ledger live in this repo and, once built, in the
Vault — because they are the training data for E4 (competitor landscape),
A1 (negatives), A5 (ad copy), and L1 (launcher). Intel that lives only in a
SaaS can't ground our tools. Use Search Atlas, if the subscription is
kept, as a **data source only**: keyword volumes, competitor SEO
footprint, rank tracking. Google's Keyword Planner (free with any Ads
account) covers volumes too.

**Campaigns: Google Ads directly, in a LIQWD manager account, built by
hand from this plan.** Not Atlas, not our launcher yet. Three reasons:

1. Our L1 launcher and the M/A monitors need the Google Ads API developer
   token, which takes weeks and is still unfiled (BUILD-ORDER, day one).
   A hand-built campaign in a LIQWD MCC sub-account becomes the live
   account those tools attach to the day the token lands — monitors are
   read-only, so they light up first.
2. Atlas's ads playbooks still need a connected Google Ads account; at one
   or two campaigns the extra layer adds cost and moves the ledger off our
   property.
3. The blueprint explicitly wants LIQWD's own spend as the hardening
   ground before any agent's money touches the suite.

**Founder-side steps, in order (day one):** create a Google Ads *Manager*
account under a LIQWD Workspace user → create sub-account "LIQWD — Agent
acquisition" with billing → from the manager account apply for the **API
developer token (Basic access)** → link GA4 → create the conversion
actions in §6. The token application is the long pole; file it before
building anything.

## 1 · Objective and funnel

Objective: **free-tier agent signups** in Ontario, GTA first. Secondary:
free "See what Google thinks of you" audit requests (the top-of-funnel hook
Luxury Presence's own reps use).

Funnel: search ad → landing page (§5) → free audit or account creation →
Home's "Needs you" takes over.

Targets to start: cost per signup under $60, cost per audit under $25.
Revisit after 200 clicks per campaign, not before.

## 2 · Campaign structure (four campaigns, one account)

| Campaign | Job | Daily budget | Landing |
|---|---|---|---|
| **Conquest** | agents searching a competitor by name | $15 | `/compare` (to build) |
| **Category** | agents searching for the thing itself | $20 | marketing home / `/pricing` |
| **Brand defense** | "liqwd" and misspellings — cheap insurance against being conquested | $5 | marketing home |
| **Supply** | agents searching for pre-construction access and leads — the moat | $10 | the free lead pages pitch |

Total $50/day ≈ $1,500/mo. Hard cap at the account level, per A6.
Geo: Ontario; language English; all devices; schedule all hours (leads
reply at odd hours, agents search at odd hours). Bidding: manual CPC with
a max of $8 for the first two weeks, then Maximize Conversions once 15+
conversions exist. Launch **paused**; enable after founder approval.

### 2a · Conquest ad groups (one per competitor)

Keywords on **phrase** and **exact** only; never broad. Patterns per
brand: `{brand}`, `{brand} pricing`, `{brand} cost`, `{brand} reviews`,
`{brand} alternative`, `{brand} vs`.

Luxury Presence · Real Geeks · AgentLocator · Web4Realty · InCom ·
myRealPage · RealtyNinja · Placester · kvCORE / BoldTrail · Ylopo · Sierra
Interactive · AgentFire · Agent Image · Follow Up Boss (CRM searchers are
website buyers too).

Expect low volume, high intent, CPCs $3–10. Quality Score will be
mediocre on competitor terms (Google knows we aren't them); the landing
page's relevance does the lifting.

### 2b · Category ad groups

- *Websites:* real estate agent website, realtor website builder, real
  estate website canada / ontario / toronto, idx website canada, real
  estate website with mls
- *Marketing:* real estate marketing services, realtor marketing company
  toronto, real estate lead generation toronto / ontario, google business
  profile real estate agent
- *Leads:* real estate leads canada, buyer leads for realtors, seller
  leads ontario

### 2c · Supply ad groups (the lane no competitor has)

pre construction leads for realtors · platinum access realtor · vip
broker access pre construction · new condo leads toronto · how to get pre
construction clients

### 2d · Negatives (seed the A1 list from day one)

jobs · job · salary · career · course · exam · license · licence · school ·
humber · reco course · free template · wordpress theme · html · tutorial ·
diy (category only — *not* on conquest, where "diy alternative" is us) ·
reddit · login · sign in (competitor login intent, zero value) · zillow ·
realtor.ca · houses for sale · condos for sale · rent

## 3 · Ad copy (responsive search ads — no competitor names anywhere)

Headlines (≤30 chars):

- Agent Website + Marketing
- $99/mo. No Setup Fee.
- Your Domain Stays Yours
- Cancel Anytime, Month to Month
- Built for Ontario Agents
- Done For You, Not DIY
- Blog, Google Profile & Social
- Free Leads From New Homes
- See What Google Thinks of You
- Compare Plans in 60 Seconds
- Start Free on LIQWD
- Every Draft Waits for Your OK

Descriptions (≤90 chars):

- Your branded site, domain included. Blog, Google profile and social, done for you.
- No setup fee, no contract. Every draft waits for your approval. Built for RECO and CASL.
- Start free on LIQWD. Upgrade when you want your own brand. Leads from your pages go to you.
- Run a free check of your online presence and see what to fix. Takes a minute.

Conquest variant swaps in "Compare Plans in 60 Seconds" and "Your Domain
Stays Yours" as pinned headlines; category pins "Agent Website +
Marketing" and "$99/mo. No Setup Fee." Supply pins "Free Leads From New
Homes" and "Built for Ontario Agents".

Claims audit (CLAIM-1/3/5): "$99/mo" and "no setup fee" true once the
pricing ladder ships — **the category campaign cannot go live before the
upgrade page shows $99**; "free leads from new homes" is true today (lead
pages); "built for RECO and CASL" is true of the rulebook and email
infrastructure. No superlatives, no "#1", no "best".

## 4 · Compliance (hard)

- **Competitor marks never appear in ad copy, display paths, or landing
  headlines.** Bidding on a competitor's name as a keyword is permitted
  by Google's trademark policy; using the mark in the ad is not, and in
  Canada it invites a passing-off complaint. Proposed rulebook rule
  **ADS-1** (block, presence check) — flagged for the founder's rulebook
  review; CLAIM-5 already covers factual, neutral competitor references
  on the page.
- Comparison content: every competitor number carries a source and a
  date, uses public pages only (never the private proposal), and is
  reviewed quarterly. "As published on {date}; plans change."
- LIQWD's own ads are B2B to agents, not consumer real-estate advertising,
  so RECO's advertising rules don't bind the ad itself — the landing page
  still identifies LIQWD (operator, address, contact) per general
  advertising law.
- PLAT-3: campaigns publish paused; a human enables.

## 5 · Landing pages

- **`/compare` (to build, conquest):** Part 1's table from the pricing
  blueprint with a LIQWD column, public sources linked, one CTA "Start
  free", one secondary "Run the free audit". Above the fold: the three
  sentences — no setup fee, cancel anytime, your domain is yours.
- **Marketing home / `/pricing` (category):** the three-tier ladder once
  priced; until then the marketing home with the free-tier CTA.
- **`/audit` (to build, all campaigns as secondary CTA):** name + brokerage
  → the free "See what Google thinks of you" report → create a free
  account to fix it. One Haiku call per run. Feeds P2 with a warm list.
- **Free lead pages pitch (supply):** existing.

Our own hard gate applies: no campaign launches until its landing page
is approved and tracking (§6) passes M3's checks.

## 6 · Tracking (M3 checklist, before anything is enabled)

Conversion actions: `signup_completed` (primary, server-side on account
creation), `audit_requested` (secondary), `pricing_viewed` (observation
only). GA4 linked; auto-tagging on; UTM convention
`utm_source=google&utm_medium=cpc&utm_campaign={conquest|category|brand|supply}&utm_content={adgroup}`
stored on the profile at signup (`referred_by` stays for agent referrals;
add `acquisition_utm` jsonb — spec it with entitlements in 0006). Call
extension → LIQWD number with call reporting. Sitelinks: Pricing ·
Compare · Free audit · For agents.

## 7 · Launch checklist

1. [ ] Manager account + sub-account + billing (founder)
2. [ ] API developer token applied for (founder) — long pole, day one
3. [ ] GA4 linked, conversions created, M3 checks green
4. [ ] `/compare` and `/audit` built and approved; pricing page shows $99
5. [ ] Campaigns built from §2–3, **paused**
6. [ ] Founder approval → enable Brand defense + Conquest first (cheap,
       high intent); Category and Supply one week later
7. [ ] Weekly: search-terms review → negatives (A1 by hand until the API);
       first performance pulse at 200 clicks per campaign

## 8 · What the tools inherit

Everything above is the seed data for: E4 competitor landscape (the
brand list + table), A1 negatives engine (§2d), A5 ad copy (§3 as the
approved baseline), L1 launcher (§2 as the first campaign template), M3
tracking health (§6), and the approval queue (this plan is the first
`campaign` subject staged for approval once the queue has a UI for it).
