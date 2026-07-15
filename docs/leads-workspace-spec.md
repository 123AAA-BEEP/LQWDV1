# Leads workspace — design + scope

Status: **BUILT (v1)** in this branch. Realtor-facing lead inbox at
`/dashboard/leads`: every buyer inquiry routed to an agent, with contact
details and a pipeline to work each lead from new to won.

## Why
The free-leads promise is the platform's core realtor pitch, and the plumbing
behind it was already complete — capture on every public project page, sharer-
wins `?ref` attribution, steward routing, an instant email alert, a weekly
digest — but a realtor could never actually **see their leads**. The only
realtor-facing surfaces were counts (Lead Pages stats, the home Lead Path
panel); the full lead table was admin-only. RLS already granted realtors
SELECT + UPDATE on their own rows (`assigned_realtor_profile_id = auth.uid()`,
migration 0002) — the workspace is the missing UI over grants that existed
from day one.

## Decisions (confirmed with product, 2026-07-15)
- **Public lead collection stays ON. Never disable capture.** Nothing gates
  the intake; the messaging work is expectation-setting only.
- **"Coming soon" framing around the volume, not the feature.** The inbox is
  live and honestly says so; what's "coming" is lead volume as consumer
  traffic ramps. Copy sets that expectation without apology.
- **No public benchmark.** No "500 agents", no counts, no dates — nothing to
  miss. The standard no-guarantee disclaimer (from `get-free-leads`) rides on
  every new lead surface per the brand copy guardrails.

## What ships
### DB — migration `0073_lead_status_pipeline.sql`
Realigns the `project_leads.status` check constraint to the pipeline the app
actually uses (`src/lib/leads.ts`): `new|contacted|qualified|won|lost|spam`.
The 0001 constraint still had `closed` instead of `won`/`lost`, so the admin
console's Won/Lost updates were **silently failing** (the constraint rejected
them and the action never checked the error). Zero rows used `closed`/`spam`
at migration time; no data change. Fixes admin + unblocks the workspace.

### The workspace — `/dashboard/leads`
- Approved-realtor gated (`requireUserProfile` + `isApproved` +
  `VerificationRequired`), same as Lead Pages.
- Lists this realtor's leads (RLS-scoped + explicit `eq` so an admin visiting
  sees only their own): contact block (mailto/tel), message, timestamp,
  project link via `public_projects_view` (public-safe; unpublished projects
  lose the link, not the lead), and how it arrived — "via your referral link"
  (`referred_by_profile_id = me`) vs "from your project page" (steward).
- Pipeline: stat row (Total / New / In progress / Deals closed), status filter chips
  with counts, `?q` search over name/email/phone, and a per-lead status
  select posting to `updateLeadStatus` (validates against `LEAD_STATUSES`,
  updates only own rows, flash-confirms). Mirrors the admin leads console.
- **Empty state = the coming-soon panel**: dashed card in the established
  ComingSoonCard style — "Your first leads: coming soon / This inbox is live —
  leads land here the moment they arrive", honest early-days copy (traffic
  builds week over week, active pages first in line), CTAs to
  `get-free-leads` + `lead-pages`. No numbers.

### Entry points (reuse, no parallel surfaces)
- Sidebar: "Leads" (`Inbox` icon) in the New Homes zone beside Lead Pages, in
  both `REALTOR_SECTIONS` and the admin mirror.
- Home: a Leads ActionCard beside Lead Pages; the first-lead confetti Notice
  now links "Open your leads →"; the Lead Path panel CTA deepens with
  progress (inquiries → Leads inbox, pages only → Lead Pages, nothing →
  setup guide).
- The instant lead-alert email CTA now lands on `/dashboard/leads` ("Open
  your leads") instead of the project page — contact details + pipeline live
  there.
- `get-free-leads`: "Where leads land" info notice (links the inbox, sets the
  early-volume expectation) + a footer link. Lead Pages header links the
  inbox.

### Status language (2026-07-15 direction: "speak agent, not CRM")
UI labels in `src/lib/leads.ts` are written the way an agent reads a buyer,
shared by the realtor inbox and admin console. DB values are storage keys —
label changes never need a migration:
`new` → **New** · `contacted` → **Contacted** · `qualified` → **Active
buyer** · `won` → **Deal closed** · `lost` → **Went cold**.

## Deliberately out of scope (v1)
- Notes / follow-up reminders on a lead (would need a new column or table).
- In-app notifications (the live-DB `notifications` table is still unused by
  any code path) and realtime updates.
- Realtor-set `spam` status; lead reassignment (admin console owns both).
- Wiring the weekly digest cron (route exists; `vercel.json` never schedules
  it — pre-existing, tracked in roadmap).
