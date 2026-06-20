# LIQWD — flagged future work

Agreed-but-deferred items. Flag here, build later. (Most recent on top.)

## Shipped
- **Broker Portals** — directory with search + city/type filters, **featured
  (paid) placement**, admin management in the project editor, published-gated
  population, a "Portal" badge on Browse cards, signed URLs for file portals,
  and **click tracking** (`broker_portal_events`). Direct-link model.
- **Quick Wins / rental referrals** — paying-buildings feed, refer-a-buyer flow,
  agent status view, admin queue + developer self-serve inbox.
- **Color-coded intent zones** (sidebar + home) with descriptors; realtor +
  developer reorg; de-jargoned nav copy.

## Realtor experience
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
