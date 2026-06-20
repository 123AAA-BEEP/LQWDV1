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

## Onboarding & education (saved concept — to discuss)
Make the earning model **dummy-proof** with a guided walkthrough, not just labels.
Format options (likely a mix): an **interactive first-run product tour** (tooltips
that walk the Earn / Explore / Account zones), a short **explainer per section**,
and/or a one-screen **"How you get paid on LIQWD" infographic**. A first-run
**checklist** ("complete your profile → submit/claim a project → get leads") could
anchor it.

The core "how you make money" messages it should teach:
- **Contribute → free leads.** Submit a project *or* an update on any project and
  leads route to you for free (lead stewardship — you become the assigned realtor
  on its public page).
- **Go Pro → more lead pages.** The paid tier unlocks up to ~10 project
  lead/landing pages.
- **Quick Wins** — get paid to refer renters (PBR referral income).
- **Negotiate Terms · Developer Deals · Buyer Matching · Refer & earn** — the
  other earn paths, one line each.

Recommendation (for the follow-up chat): an **interactive per-zone tour** + a
single **"How you get paid" map** beats one long video — cheaper, skimmable, and
it lives where the action is. Build on from there.

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
