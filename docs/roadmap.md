# LIQWD — flagged future work

Agreed-but-deferred items. Flag here, build later. (Most recent on top.)

## Shipped
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

## Notes
When picking one up, sync with `main` first (the SessionStart hook does this).
