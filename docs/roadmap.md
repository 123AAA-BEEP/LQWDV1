# LIQWD — flagged future work

Agreed-but-deferred items. Flag here, build later. (Most recent on top.)

## Shipped
- **pSEO networks (playbook #86–88)** — City × Type pages
  (`/new-homes/[city]/[type]`, `lib/city-types`, inventory gate ≥3; below
  the gate combos stay browse-filter URLs), "[A] vs [B]" comparison pages
  (`/compare/[pair]`, `lib/compare`: same-city same-type nearest-priced ≤3
  peers per project, alphabetical canonical + 308 for reversed order,
  no winner-crowning), "Compare with…" chips + a "How this listing is
  verified" E-E-A-T module on project pages (describes what we check —
  audit_rank-aware — NEVER where data came from; provenance stays
  admin-only). Both networks in the sitemap; city hubs link gated type
  pages. **Rejected from the playbook: #94 marketplace auto-syndication
  (ToS violation — agent share rails are the legit substitute), #89
  first-person AI stories (fabricated experience), #91 AI finder deferred
  (cost/abuse; converts existing traffic, not new).** Next from playbook:
  #90 consumer "Pre-Con Digest" (public subscribe + weekly cron).
- **CRM spine + agent newsletter** (migrations 0087–0088) — agent-owned
  Clients book at `/dashboard/crm` (contacts with CASL consent attestation,
  project interests, follow-up tasks with a due-now surface, logged
  call/email/text/meeting history, one-click "Save to clients" from the
  Leads inbox), and the curated blast at `/dashboard/newsletter`: pick 1–7
  published Insights articles + personal intro → co-branded email to
  consented contacts only. Compliance enforced server-side: global
  suppression checked at send time, HMAC unsubscribe on every email, CASL
  sender block, TRESA agent+brokerage identification, one send per 24h,
  500-recipient cap. Article links carry the agent's ref code — clicks that
  become inquiries are the agent's attributed leads. **Worksheet objects
  (livestream-launch build, deferred) will hang off crm_contacts.**
  Founder-side before volume: a dedicated sending domain/subdomain for
  agent blasts so list quality never touches core deliverability.
- **Assignment-valuation capture (`/assignment-value`)** — consumer-side
  wizard for pre-construction owners asking "what's my assignment worth"
  (migration 0085): project → paid/year → unit → occupancy stage → APS
  assignment clause → contact. Soft-matches the typed project against
  tracked inventory (success-state context + admin quick-jump). Free
  human-assessment promise (no fake instant number), ops + consumer emails,
  admin Assignments queue + badge, footer/home-value cross-links, sitemap.
  Demand side of the Assignment Desk loop: qualified leads become gated
  listings via an agent — listings stay gated-never-public; the lead form is
  public by design.
- **Agent-match wizard (`/match`)** — our adaptation of the
  realestateagents.com / ReferralExchange funnel (migration 0084,
  `match_requests`): one question per screen (intent → price band → type →
  location → timeline → name → contact), micro-commitments before PII,
  "Not sure" escape hatches, ?city= ad-landing personalization, "finding
  your agents" reveal. Our differences: matched public agents shown
  INSTANTLY as real reviewable profiles (no email/SMS gate), CASL-clean
  one-sentence consent, consumer shortlist email + ops email, admin Agent
  match queue + badge. **Speed-to-lead blast**: the (≤3) shown agents are
  emailed the lead the moment it exists — reply-to goes straight to the
  consumer, tel: CTA when a phone was given — replicating the incumbent's
  real mechanic (their "list" is theatre; the product is agents calling in
  minutes) without the pile-on or the per-lead fee. **v2 flags: SMS OTP lead verification (needs
  Twilio), automatic agent assignment/round-robin, per-campaign ?intent=
  preselect variants.**
- **Home-value seller funnel + discovery wiring** — `/home-value` hub +
  programmatic Ontario `/home-value/[city]` pages (migration 0083,
  `valuation_requests`, admin Home values queue + nav badge). Honest model:
  free agent-prepared CMA, no fake instant estimate. Discovery: homepage
  "Latest insights" strip, project-page "From our Insights" cross-links,
  IndexNow pings on article publish (existing lib), footer links.
  **Deferred (flagged, not built): resale glossary content set; "find an
  agent in [city]" directory pages (thin until agent count grows); Nobul-style
  agent-bidding marketplace (needs its own product decision); automatic
  agent distribution of valuation leads (v2 — assigned_realtor_profile_id
  is in place).**
- **Brokerage content engine** — 20-brand deep-dive + 8-pair head-to-head
  backlog (migration 0081), web-search-grounded with published-facts-only /
  no-rankings / accurate-or-nothing rules and a server-appended disclaimer;
  fed by the daily cron (piece 3 of 3) and an on-demand admin generator. See
  `docs/growth-engine-spec.md` §5.
- **Daily content pipeline** — cron drafts a project-of-the-day spotlight +
  a sourced market note into the article review queue every morning (capped,
  ops-emailed, never auto-publishes), plus hand-written `agent_guide` type
  (migration 0080) with three seeded new-licensee pieces. See
  `docs/growth-engine-spec.md` §3–4.
- **Growth engine v1 (articles + analytics)** — Insights articles: AI-drafted
  from PUBLIC-SAFE project data only (`src/lib/articles.ts`), human-reviewed in
  Admin → Articles (draft → in_review → published), live at `/insights` with
  Article JSON-LD + sitemap entries. First-party analytics: server-side
  `page_events` (no script, no cookies, salted daily session hash) on project /
  article / agent-profile pages + lead submits, admin Analytics tab, and
  `first_responded_at` speed-to-lead stamping. Migrations 0078–0079. See
  `docs/growth-engine-spec.md`. **Phase 2 of the original build prompt
  (sponsored placement / paid lead routing) is intentionally NOT built — it
  conflicts with the free-leads promise and needs an explicit founder call.**
- **Leads workspace (v1)** — realtor lead inbox at `/dashboard/leads` with the
  status pipeline, plus a coming-soon-framed empty state around the free-leads
  promise (capture stays on, no benchmark numbers). Migration 0073 fixed the
  status check constraint that was silently rejecting Won/Lost. See
  `docs/leads-workspace-spec.md`. Follow-ups flagged below.
- **Onboarding walkthrough (v1)** — TurboTax-style, one-concept-per-slide,
  money-led guided tour at `/dashboard/start` (self-contained, no tour library).
  Ships the live NOW paths (free leads · more lead pages/Pro · refer an agent ·
  match a tough buyer · negotiate better terms) + the "everything in one place"
  data card. The rental-referral and **Developer Deals** paths are content-
  complete but **gated behind a "Coming soon" panel** (no CTA) until their
  partners/deal flow exist. Entry points: a dismissible "Get started" banner on
  the realtor home (localStorage-sticky) and a persistent **Account → Get
  started** sidebar link. See `docs/onboarding-content.md`.
- **Broker Portals** — directory with search + city/type filters, **featured
  (paid) placement**, admin management in the project editor, published-gated
  population, a "Portal" badge on Browse cards, signed URLs for file portals,
  and **click tracking** (`broker_portal_events`). Direct-link model.
- **Quick Wins / rental referrals** — paying-buildings feed, refer-a-buyer flow,
  agent status view, admin queue + developer self-serve inbox.
- **Color-coded intent zones** (sidebar + home) with descriptors; realtor +
  developer reorg; de-jargoned nav copy.

## Onboarding & education (v1 shipped — follow-ups)
v1 is live (see Shipped). Possible v2 work when we have appetite:
- **Flip the rental gate to live** the moment a PBR partner signs — swap the
  "Coming soon" panel for the real refer-a-buyer CTA (`/dashboard/quick-wins`).
- **Persistent "Get started" checklist** with a real progress meter tied to
  actual actions (profile complete → submitted/claimed a project → first lead).
  v1 uses a localStorage-dismissed banner, not progress tracking.
- **Flip the Deal Desk gate to live** once developer deal flow exists — swap its
  "Coming soon" panel for a real CTA into `/dashboard/deal-desk` (Buyer Matching
  and Negotiate Terms already ship as live tour paths).
- **Per-zone in-context tooltips** (react-joyride/Shepherd) if we later want a
  guided overlay on top of the live UI, not just the standalone walkthrough.

## Realtor experience
- **Promote Phase 1 (Meta Marketing API)** — one-click campaign creation in
  the agent's own ad account + Lead Ads webhook into project_leads. BLOCKED on
  founder-side Meta business verification + app review (see
  `docs/meta-promote-spec.md`). Phase 0 ad kit is live.
- **Leads workspace v2** — per-lead notes + follow-up reminders; in-app
  notifications (the live-DB `notifications` table still has no code path);
  realtor-set spam flag. Also: `vercel.json` never schedules
  `/api/weekly-digest` despite the route's "Mondays 9am ET" comment — wire the
  cron or document the external scheduler.
- **Portal impressions** — accurate counts need a client-side beacon
  (server-render counts over-count via prefetch). Clicks are already tracked.
- **Earnings dashboard / estimator** — lifetime + pending referral $ for agents.
- **Notifications** on referral status changes (and other queue events).

## Rentals / PBR
- **Payout ledger** — turn `rental_referrals.payout_status` into real
  invoicing/tracking (brokerage-to-brokerage per TRESA), triggered off "accepted".
- **Re-point `referral_opportunities_view`** at `broker_projects_view` (currently
  admin-scoped) if we want one reusable feed query.

## Scoped, not scheduled (founder session 2026-08-02)
Full scoping in `docs/scoping-ingestion-microsites-florida.md` — three
concepts, no build authorized:
- **Ingestion tool** (Instagram via Business Discovery API — blocked on the
  same Meta verification as Promote Phase 1; email intake aliases = near-
  free v1; Meta Ad Library = manual ops sweep, API doesn't cover housing).
- **Single-project lead-gen microsites** (standalone lead machines, NOT a
  PBN; unique generated content, no impersonation, nightly redeploys from
  live data; post-sellout pivot to assignments; Cloudflare/Porkbun + .ca).
- **Florida coming-soon pilot** (Miami-first: portal-free pre-launch SERPs,
  reuses discovery feeds already running; TCPA consent variant; flat
  per-lead monetization per FS 475).

## Developer experience
- **Research Module (Zonda-style) — future project (founder-flagged
  2026-07-31).** Full spec + data-gap assessment in
  `docs/research-module-spec.md`. Short version: software is ~90% buildable
  on existing rails; build the FREE-data subset first (StatCan census +
  CMHC rentals + HCRA/Tarion builder registry + our tracking) as the
  `/dashboard/research` module; Teranet closings / MLS resale / parcel data
  are the paid blockers, decided later from revenue. **Independent first
  step whenever ready: the append-only price/status history log — every
  week unbuilt is history lost.** Also: floorplans (4 rows) + incentives
  (1 row) need pipeline backfill before any CMA-report feature.
- **Launch Services framework (the kitty — founder-flagged 2026-07-30).**
  Surface is live at `/dashboard/launch-services` (three-flavour menu +
  interest capture, ops-emailed); the DELIVERY framework is deliberately
  unbuilt. When demand signals justify it, standardize per Dan's
  pick-a-direction method: **Launch Essentials** (self-serve playbook:
  listing optimization + agent eBlast + launch-night + lead routing),
  **Full Launch Engine** (done-for-you campaign w/ weekly absorption
  reporting), **Rescue & Re-Launch** (stalled-project diagnostic + reset).
  Target: mid-sized developers, low-rise projects. Build the flavour the
  interest form votes for first; the livestream-launch build (deferred
  playbook item) becomes a deliverable inside these packages.
- **PBR lead partnerships** — surface live at `/dashboard/rental-partners`
  (pitch + interest capture). Framework when a pilot signs: qualified-lead
  definition (move-in/beds/budget), per-lead vs per-signed-lease pricing
  (marketing-services model — clean; % -of-lease referral would drag in
  registrant/TRESA territory, avoid), delivery via the existing
  rental_referrals loop + renter capture, monthly reporting.
- **Promote now** (Featured listing, eBlast to agents/buyers) and **Research**
  (project analytics, buyer-demand signals) — "coming soon" hubs at
  `/dashboard/promote` and `/dashboard/research`.
- **Broker-portal ad billing** — invoice featured placement off click counts
  (the `broker_portal_events` data is already being collected).

## API cost (from Anthropic's low-cache-hit-rate email, 2026-07-19)
- **Prompt caching audit done.** Added automatic caching to the two
  multi-round web-search loops (project-audit, email-intake research) — the
  only call sites where it engages: rounds resend a search-result-heavy
  conversation seconds apart. The other 9 direct-API call sites have stable
  prefixes of ~0.5–1.5K tokens, BELOW Opus 4.8's 4,096-token cacheable
  minimum — markers there are silent no-ops. Do NOT pad prompts to game the
  minimum.
- **The bigger lever (future work): Message Batches API — flat 50% off** all
  tokens, no prefix requirements. The audit/hero-audit/hero-sourcing/discovery
  crons are non-latency-sensitive batch loops, exactly what it's for. Needs a
  submit → poll → collect rearchitecture of those routes (batches finish
  within ~1h; results keyed by custom_id). Worth doing when API spend is a
  line item that matters.

## Notes
When picking one up, sync with `main` first (the SessionStart hook does this).
