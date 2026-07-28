# Growth Ideas Assessment — the 9 "companies playbook" ideas vs. reality

**Date:** 2026-07-28 · **Status:** ideation/assessment only — nothing implemented.
Assesses the nine ideas distilled from `docs/growth/150-growth-strategies-companies-ran.md`
(branch `claude/network-effects-growth-hacks-zdbl4w`) against (a) what `origin/main` + the live
DB actually contain and (b) outside research. Companion to `docs/realtor-offer-brainstorm.md`.

---

## The ground truth that frames every verdict

Live DB (LIQWD DB V1, 2026-07-28): **2,008 projects**, 1,279 public pages, **1,132 commission
records**, 2,749 media, 401 off-market listings, 126 broker portals, 123 SEO hub entries,
2,714 discovery signals, 27,270 recruit targets, 129 intake emails —
vs. **16 profiles, 8 leads, 0 assignment listings, 0 mandates, 0 reviews, 4 floorplans**.

Read: the platform is **supply-rich and audience-poor**. These nine are mostly **traffic** ideas —
correctly so, traffic is the binding constraint. Monetization rails already exist on main
(Stripe: Pro $9.99 / Ultra $19.99 + Deal Desk / Developer $199 / connect credits) and mostly
should NOT gate these; the ideas feed those rails.

Second frame: main already runs an **enrichment machine** (discovery cron, market radar, email
intake, SEO backfill, hub content). The highest-leverage ideas below are the ones that convert
that machine into **public data assets** — the HouseSigma playbook (sold-data tools → 1M+
GTA visitors/mo) replayed for pre-con.

---

## Verdicts, one per idea

### 1. Assignment Value Estimate — BEST IDEA ON THE LIST ★
- "Nobody has this in GTA" is **essentially true for the estimate**. Crowded adjacent space
  (CondoNow assignments, Assign Circle, Assign-Now, GTA-Assignment, TorontoCondosVIP, Kijiji)
  **lists** assignments; HouseSigma lists precon assignments and runs a **resale** AVM — but
  no one publishes an algorithmic "what is your contract worth now vs. what you paid" tool.
- Strategic fit: it is the **seller-side lead magnet** the listing sites lack, and the supply
  seeder for the already-built Assignment Desk (0 listings today).
- v1 without licensing pain: building/area-level PPSF bands + incentive environment → a
  **range**, precise number behind free signup. `assignment_listings` already carries
  `original_purchase_price` + `assignment_price` (migration 0072) — every future listing
  compounds a proprietary comp set.
- PR wrapper: quarterly **GTA Assignment Index** (the `/reports/gta-pre-construction` page
  already ships Dataset schema — extend the pattern).
- Risks: never publicly label named projects "underwater" (accuracy/defamation + TRESA
  false-or-misleading advertising); hard "not an appraisal" disclaimer; expect HouseSigma
  fast-follow — moat is assignment-specific data + the Desk, not the algorithm.

### 2. PPSF from MLS sold comps — FEASIBLE, CHEAPER THAN ASSUMED
- Path: TRREB/PropTx **VOW** agreement (~$1,500/yr feed + vendor API, e.g. Repliers), held via a
  **member brokerage** (founder's or partner). VOW rule: sold-derived data behind login —
  which matches LIQWD's gated architecture exactly (gate = registration driver).
- Caveat: **assignment closing prices themselves are not in MLS** (private until final closing);
  use building resale PPSF as proxy + agent-contributed assignment comps.
- Start with crude, defensible adjustments (floor, exposure, age); do not oversell finishes/
  perception precision at v1.

### 3. Hopper buy-now-vs-wait — RIGHT AMBITION, WRONG FIRST STEP
- Data needed (the founder's question): per-project **price-list time series**, **incentive-change
  events**, **absorption/velocity + standing inventory** (Urbanation sells this), area resale PPSF
  trend (VOW), rates/completions macro. Hopper ingests ~300B prices/mo for its ~95% claim;
  pre-con is slower/lower-n → credible calls need **12–18 months of event logging**.
- Do now: `price_snapshots` + `incentive_events` fed by the existing email-intake + discovery
  machinery; ship **"Price & Incentive History" per project** (nobody shows this) → predictions later.
- Hopper's monetization lesson: prediction was the trust/traffic hook; ~40% of revenue came from
  fintech layered on top → LIQWD analog: predictions feed Deal Desk/mandates/connects, never a paywall.

### 4. Carvana-style standardized listings — YES, BUT NOT "VS BLACKLINE"
- BlackLine (ADHOC Studio) is the **developer's** per-project sales platform (60%+ of the
  largest GTA projects). It standardizes *within* a project and is paid by developers — it
  structurally cannot do **neutral cross-project comparison**. That's the open lane.
- Honest blocker: **4 floorplans in the DB**. Prerequisite is an extraction pipeline (AI parse of
  brochures/price sheets already flowing through email intake) into a standard unit spec
  (beds/baths/sqft/exposure/PPSF/maintenance/deposit structure/incentives) → compare pages = SEO.

### 5. Interactive stacking view — SPLIT VERDICT
- **Static** stacking (floor plate + unit matrix, "as of [date]") = buildable, great flagship-page
  PR/SEO artifact once unit data exists (see #4).
- **Live availability** is the structural moat of developer-side tools (BlackLine/Avesdo/Spark).
  Crowdsourced availability goes stale and burns trust — label freshness honestly.
- Don't build "our own BlackLine": their customer is the developer. Later, per-project
  availability feeds via developer partnerships (Deal Desk relationships) flip this.

### 6. Duolingo-style buyer education — REFRAME: MILESTONES, NOT STREAKS
- Why people would play (the founder's question): only if completion unlocks **real value**.
  Streaks fit daily practice; buying is episodic. Build a **readiness passport**: modules
  (deposits, assignments, interim occupancy, closing costs — calculator content reused) →
  documented tier feeding Bronze/Silver/Gold **buyer mandates** (table exists on main) →
  tangible unlocks: priority launch-access windows, incentive eligibility, lender fast-track.
- Precedents: Zogo (banks pay users to finish financial-education modules); CMHC/US-style
  homebuyer-course certificates unlocking loan programs.
- Sequencing: buyer audience ≈ 0 today — run after calculators/AVE bring buyers. Inducement
  structuring + PIPEDA care on readiness data.

### 7. Calculator SEO magnets — ALREADY STARTED; TWO OPEN NETS
- Live on main: deposit, HST-rebate, LTT calculators with FAQ/WebApplication schema + `/tools` hub.
- SERP research: **interim occupancy calculator — no interactive tool ranks at all** (only
  explainer posts + Tarion guide). **Assignment tax calculator — one tax-law firm** (Advotax)
  plus generic HST pages. Both are winnable lanes.
- Build sheets:
  - *Interim occupancy* (Condominium Act s.80): interest on unpaid balance (prescribed rate) +
    est. property tax (municipal rate table) + est. common expenses ($/sqft) × months.
  - *Assignment tax*: post-May-7-2022 rule (individual assignments GST/HST-taxable — 13% in ON,
    including deposit-recovery portion) + federal anti-flipping (<12 months → business income) +
    capital-vs-business toggle. Heavy disclaimers; educational only.
  - *Closing-cost stack*: LTT + Toronto MLTT + FTB rebates, NRST, HST rebate mechanics, builder
    adjustments/DC caps.
  - *NEW — Bill C-4 FTHB GST rebate* (Royal Assent 2026-03-12; up to $50k; full ≤$1M, phase-out
    to $1.5M): dedicated page = freshness win; **verify the live HST-rebate calculator reflects
    C-4**.
- Per-jurisdiction: ship Ontario; BC variant later (GST 5% + PTT, no s.80 equivalent, assignment
  disclosure regime) via a per-province rules file. Quarterly rules-review calendar.
- Lead capture: never gate the result; gate the emailed PDF breakdown.

### 8. Livestreamed launches — LOVE IS ALLOWED, WITH THREE CHECKS
1. **Audience math**: 16 profiles → stream on existing social (IG Live/YouTube) as *acquisition*,
   don't build in-platform streaming.
2. **Compliance**: TRESA advertising (brokerage identification, nothing false/misleading,
   incentives are the developer's to authorize) → run under a brokerage banner with developer
   pre-approval. PIPEDA basics for registrant capture.
3. **Stack is trivial**: StreamYard → YouTube Live + in-stream worksheet link (worksheets design
   doc exists on main) + replay page per project (SEO).
- Format: launch-day walkthrough → floor-plan run-through → incentive window → live Q&A →
  worksheet CTA. Pilot with ONE developer; the pilot doubles as Deal Desk BD. First-mover in
  Canadian pre-con broker streaming: plausible (today = platinum events/Zoom launches; China's
  Beike-style live selling is the scale precedent).

### 9a. Fantasy pre-con portfolio — CAMPAIGN, NOT PRODUCT
- Scoring needs a credible appreciation feed → the AVE/index must exist first.
- Twist that fixes "needs to be more fun/competitive": make it an **agent** game first (audience
  that exists): seasonal draft of launches, scored on absorption/price moves, leaderboard +
  prize — and it doubles as a **data-collection engine** (agents report the numbers to win).
- Canadian contest law: skill-testing question, no-purchase-necessary, published rules, Quebec
  handling — counsel review before any prize.

### 9b. Map-first + QR on hoarding — MAP YES (LATER), GUERRILLA QR NO
- Map: right long-term UX (projects have lat/long; no map lib on main). "Launching soon" pins from
  `discovery_signals` are a real differentiator. Table stakes though — not a growth hack.
- **Unauthorized QR stickers on hoarding: don't.** Hoarding is the developer's property/permitted
  signage; unauthorized postering violates Toronto Municipal Code Ch. 693 on public property,
  is trespass/mischief on private property — and torches the exact developer relationships the
  Deal Desk monetizes.
- Legal versions: developer co-marketing QR *on their own hoarding* (pitch = free lead capture +
  a better project page), OOH/transit near sites, Google Business/Maps presence per sales centre,
  geo-targeted social by site radius.

---

## Sequencing (Now → Next → Later)

**Now (weeks, mostly built assets):**
1. Two new calculators (interim occupancy, assignment tax) + C-4 verification on the HST page.
2. AVE v1 as range-tool + first quarterly GTA Assignment Index (gate precise number behind signup).
3. Start logging `price_snapshots` / `incentive_events` from the intake machine (costless now,
   compounding moat for #3/#9a).

**Next (1–2 quarters):**
4. VOW agreement via brokerage → building-level PPSF pages behind login.
5. Floor-plan/price-sheet extraction pipeline → standardized unit spec → compare pages.
6. Livestream pilot with one developer on social + replay pages.

**Later (audience-dependent):**
7. Static stacking views on flagship projects → developer availability partnerships.
8. Readiness passport → mandate tiers; agent fantasy season; map-first mobile UX.

**Monetization thread:** all of it feeds existing Stripe rails — tools → free signups → Pro
(branded profile/landing pages); AVE/Desk → seller supply → Ultra/Deal Desk; livestreams/spec
pages → developer relationships → $199 developer seats + featured placement. Keep the new
public tools free.

## Addendum (2026-07-28): PPSF without displaying sold comps

Decision under evaluation: use MLS-derived per-square-foot logic but never display the
underlying sold comps. What changes:

**Doesn't change:** the need for licensed access, and the VOW feed's *use* restrictions. The
TRREB/PropTx VOW agreement restricts use beyond brokerage services and prohibits derivative
products/marketing reports built on the feed — so publishing MLS-feed-derived numbers on
public (no-login) pages is still offside without explicit permission, comps shown or not.
Defensible posture stays: derived estimates behind free registration under a member
brokerage's VOW (the HouseSigma model).

**Does change (in our favor):**
1. Display-compliance surface shrinks — no listing-level content/photos/attribution/takedown
   obligations to manage, no non-bona-fide-consumer listing display issues.
2. Opens the **registry route**: Teranet/POLARIS sales data (and Teranet's own AVM products)
   under a commercial license with no board rules — granular, public-display terms are a
   contract negotiation, and registry covers non-MLS transactions. Note: a registrant's
   personal GeoWarehouse access cannot be productized into the site; that requires a
   commercial Teranet deal.
3. The public tier can run entirely on strings-free data: TRREB Market Watch published
   aggregates + CMHC/StatCan + **our own pre-con dataset** (launch prices, price sheets,
   incentives — never MLS-sourced, fully ours).

**Resulting architecture:** public pages show a range built from public aggregates + our own
pre-con data → precise building-level estimate behind free signup (brokerage VOW umbrella when
the feed is added) → MLS/VOW feed as a phase-2 accuracy layer, Teranet as the option if
granular public display is ever wanted.

## Addendum (2026-07-28): "Start here" shortlist from the 9

1. **Calculators** — interim occupancy + assignment tax (open SERP lanes), verify C-4 on the
   HST page. Days of work, zero data dependencies.
2. **Assignment Value Estimate v1 + quarterly GTA Assignment Index** — public range from
   own/public data, precise number behind free signup; feeds Assignment Desk supply.
3. **Price/incentive event logging** — new snapshot tables fed by existing email-intake/
   discovery machinery; free now, prerequisite for buy-now-vs-wait and fantasy scoring later.
4. *(Ops pilot, no code)* one livestreamed launch on social with a single developer partner.

Parked until audience/data exist: stacking view + standardized spec (needs floor-plan
extraction), readiness gamification (needs buyer audience), fantasy season (needs the index),
map-first UX (worthy, later). Killed: unauthorized QR on hoarding.

## What would make this fail
- Gating the tools behind payment before traffic exists.
- Publishing named-project value/underwater claims → TRESA/defamation exposure + developer war.
- Betting on predictions before 12+ months of price-event data exists.
- Building engagement formats (streams/fantasy/gamification) before there's an audience to engage.
- Guerrilla QR: legal risk + developer-relations damage for negligible traffic.
