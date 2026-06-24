# Lead Pages & per-project Referral Links — design + scope

Status: **BUILT (v1)** in this branch. Realtor-facing tool that consolidates the
project pages a realtor is "bound to" and gives them a **direct, attributing
referral link** per project to hand to a buyer/lead.

## Why
Two facts were already true on `main` but never surfaced together for realtors:

1. **The free lead campaign binds a realtor to a project.** When a realtor's
   submitted/updated project is approved, `rewards.ts` calls
   `assignLeadStewardship()` → sets `public_project_pages.assigned_realtor_profile_id`
   + `assigned_realtor_until` (30-day stewardship) + `lead_routing_mode =
   'assigned_realtor'`. Buyer enquiries from that project's public page then
   route to them (`resolveLeadSteward`).
2. **Pro/Ultra is sold on "landing pages you can use."** The upgrade page +
   onboarding market "up to 10 project landing pages" and "inbound buyer leads
   routed to you" as paid perks.

But there was **no realtor view** to (a) see which pages they're bound to, and
**no mechanism at all** to hand a buyer a link that attributes the resulting
lead back to the sharing realtor — the public page had no `?ref` capture, so a
lead always went to the page steward regardless of who shared the link.

## Decisions (confirmed with product)
- **Attribution: the link sharer wins.** A lead captured via `?ref=<code>` is
  recorded in `project_leads.referred_by_profile_id` AND routed to that realtor
  (`assigned_realtor_profile_id`), overriding the page steward. Organic (no
  `?ref`) visits still route to the steward — unchanged.
- **Eligibility:** *Free* realtors get referral links for the projects they're
  **bound to** (earned via the free lead campaign). *Pro/Ultra* additionally
  unlock referral links for **any published project** they want to promote (the
  "landing pages you can use" perk). Enforced in the dashboard UI.

## What ships
### DB — migration `0028_referral_link_attribution.sql`
- `project_leads.referred_by_profile_id uuid → profiles(id) on delete set null`
  + index. Additive, idempotent, backwards-compatible. No RLS change needed:
  existing `leads_select`/`leads_update` already key off
  `assigned_realtor_profile_id = auth.uid()`, and referral-link leads are always
  assigned to the referrer.

### Public site — attribution capture
- `/projects/[slug]` reads `searchParams.ref` and passes it to the lead form.
- The lead form forwards `ref` as a hidden field.
- `submitLead` (service-role action) resolves `ref` → an **approved realtor**
  via `profiles.referral_code` (the same per-profile code used by `/signup?ref`).
  If valid: `referred_by_profile_id = that realtor` and the lead routes to them
  (sharer wins); otherwise falls back to the existing steward routing.

### Realtor dashboard — the tool: `/dashboard/lead-pages`
- **Your project pages** (all approved realtors): the projects they're bound to
  (`public_projects_view` where `assigned_realtor_profile_id = me`), each with a
  campaign status (Active / Expiring soon / Expired, from `assigned_realtor_until`),
  this realtor's lead count for it, a **View page** link, and a **copy referral
  link** (`/projects/<slug>?ref=<referral_code>`).
- **Promote any project** (Pro/Ultra): search published projects and copy a
  referral link for any of them. Free realtors see a Pro upsell here instead.
- Empty/edge states explain how to earn pages (submit/update a project) and how
  the link attributes leads.
- Surfaced in the sidebar ("New Homes" zone) and as a home action card.

## Reuse (no parallel surfaces — extends what exists)
- `profiles.referral_code` (already unique, already powering `/signup?ref`).
- `public_projects_view` (public-safe, granted to authenticated) for both lists.
- `resolveLeadSteward()` unchanged; ref attribution layers on top.
- `CopyLink` pattern from `dashboard/refer`.

## Deliberately out of scope (v1)
- Click/impression tracking on referral links (broker portals already model
  this via `broker_portal_events`; can mirror later for ad/analytics).
- Enforcing the marketed "10 landing pages" cap (still unenforced platform-wide;
  this tool doesn't introduce a cap).
- Editing which projects a realtor is bound to (admin still owns assignment /
  the reward engine owns stewardship).
