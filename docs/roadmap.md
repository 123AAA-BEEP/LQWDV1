# LIQWD — flagged future work

Agreed-but-deferred items. Flag here, build later. (Most recent on top.)

## Shipped
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

## Developer experience
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
