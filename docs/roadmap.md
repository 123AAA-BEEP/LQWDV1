# LIQWD — flagged future work

Agreed-but-deferred items. Flag here, build later. (Most recent on top.)

## Realtor experience
- **Broker Portals surface (Explore zone).** LIQWD is pitched as *"the ultimate
  broker portal,"* but broker portals (`project_broker_portals`) only appear on
  the broker project-detail page today. Make the promise visible in the product:
  a dedicated **"Broker Portals"** item in the **Explore** zone and/or a clear
  "Broker portal" callout within **Browse Projects** (e.g., a badge + quick link
  on project cards that have an active portal). This is why Explore currently
  holds only Projects — it's the discovery zone this slots into.
- **Earnings dashboard / estimator** — lifetime + pending referral $ for agents
  (turn Quick Wins from a feed into a running income view).
- **Notifications** on referral status changes (and other queue events) — email
  and/or in-app.

## Rentals / PBR
- **Payout ledger** — turn `rental_referrals.payout_status` into real
  invoicing/tracking (brokerage-to-brokerage per TRESA), triggered off "accepted".
- **Re-point `referral_opportunities_view`** at `broker_projects_view` (it's
  currently admin-scoped because it reads base `projects`) if we want one
  reusable feed query instead of the two-query approach the Quick Wins page uses.

## Developer experience
- **Promote now** (Featured listing, eBlast to agents/buyers) and **Research**
  (project analytics, buyer-demand signals) — currently "coming soon" hubs at
  `/dashboard/promote` and `/dashboard/research`. These are the operator
  ad-revenue + insights streams.

## Notes
These are intentionally deferred. When picking one up, sync with `main` first
(the SessionStart hook does this automatically).
