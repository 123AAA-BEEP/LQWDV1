# Promote (Meta ads) — Phase 0 shipped, Phase 1 plan

Realtor-facing "Promote this project": agent-funded Meta ads whose traffic
lands on OUR public project pages with the agent's attribution — they control
spend, we get brand + pixel + the lead flows through our system to them.

## Phase 0 — the ad kit (BUILT)
`/dashboard/projects/[slug]/promote` (approved realtors; only publicly-live
projects — an ad pointing at a 404 burns money). Entry: "Promote with ads →"
on the project view's Share card.

- **Creative**: `promote/ad-image?format=square|landscape` — next/og
  ImageResponse composing the hero into 1080×1080 + 1200×628 with a LIQWD
  frame and the CALLER's name + brokerage stamped on (TRESA advertising
  requirement, and one agent can't mint creative in another's name).
  Public-safe fields only.
- **Copy**: 3 deterministic variants (value / early-access / agent-personal)
  from public project fields. No demographic language (Housing rules), no
  income/guarantee claims (brand guardrails). Copy-to-clipboard each part.
- **Destination**: `/projects/{slug}?ref={code}&utm_source=facebook&
  utm_medium=paid&utm_campaign=promote-{slug}` — attribution + Lead Pages
  analytics already handle the rest; leads land in the agent's Leads inbox.
- **Launch checklist**: 5 steps incl. the non-negotiable **Housing special ad
  category** declaration, wide-radius audience guidance, $10–20/day starter
  budget, where results show up.

## Phase 1 — one-click via the Marketing API (NOT BUILT)
Agent OAuth-connects their Meta Business account; picks project + budget +
radius; we create the campaign IN THEIR ad account (created paused, they
confirm; their card, their spend ceiling). `special_ad_categories:["HOUSING"]`
set programmatically. Two lead routes:
1. Link ads → our page (works with today's plumbing).
2. **Meta Lead Ads** → leadgen webhook → insert `project_leads` with
   `assigned_realtor_profile_id` = the agent (instant alert + inbox, all
   existing). Cheaper CPL; traffic stays on Meta but the lead is ours/theirs.

Build items: Meta app + OAuth (Facebook Login for Business), encrypted token
storage, campaign composer (Campaign→Ad Set→Creative→Ad), leadgen webhook
endpoint + page subscription, Insights pull for a spend→clicks→leads→CPL
dashboard, disconnect/revoke handling.

### External prerequisites (founder to-do — cannot be done from the repo)
1. Meta Business Manager for LIQWD + **business verification**.
2. Create the Meta developer app; request **Advanced Access** to
   `ads_management`, `ads_read`, `pages_show_list`, `pages_manage_ads`,
   `leads_retrieval` — App Review needs a screencast of a working flow
   (build against Standard Access first).
3. Realistic calendar: 2–6 weeks for verification + review. Start now so the
   clock runs while Phase 0 proves demand.

## Phase 2 — monetization (ideas, undecided)
Flat fee per composed campaign or Pro/Ultra perk; LIQWD house-budget co-op
ads; Meta pixel on public pages → retargeting audience we own.

## Naming note
`/dashboard/promote` is the DEVELOPER coming-soon hub (Featured & eBlasts).
The realtor feature deliberately lives under the project
(`/dashboard/projects/[slug]/promote`) — don't merge them.
