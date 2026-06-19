# Worksheets & PBR Referrals — Design Doc (v0, for review)

Status: **DRAFT — pressure-test before building.** No migrations applied yet.

## 1. The thesis

A **worksheet** is the structured pre-offer an agent submits on a client's
behalf. In Ontario new-construction it's how a unit gets requested during
allocation. We make it a first-class, **reusable** object an agent saves once
per client and submits to many projects.

The same object does triple duty:

1. **For-sale** project → a pre-con **allocation request / offer**.
2. **For-lease** (purpose-built rental) project → a **qualified renter
   referral packet** routed to the operator's in-house leasing team.
3. The submission record becomes the **attribution + payout ledger** that
   proves which agent → which lead → which signed deal (what we need to
   administer PBR referral fees and prove ROI to the operator paying us).

So worksheets are the connective tissue between the rental layer, the realtor
"earn money" angle, and advertiser monetization — one feature, three payoffs.

## 2. Scope of v1

In:
- `listing_type` on `projects` (the one shared dependency with the rental layer).
- `worksheets` — agent-owned reusable client profiles (purchase or rental).
- `worksheet_submissions` — worksheet → project (+ optional floorplan), with a
  status lifecycle covering both sale and lease.
- `project_referral_terms` — per-operator "accepted referral parameters" + the
  fee/payout terms. This is the validation gate **and** the monetization core.
- A validation helper that checks a worksheet against a project's accepted
  parameters before submission.
- RLS following existing patterns (owner + admin; developer via access grant).
- An agent-facing "referral opportunities" view (the feed of who's paying).

Deferred (flagged, not built in v1):
- Payment/billing rails (we stub payout fields; ledger comes later).
- Developer self-serve editing of referral terms (admin-managed in v1).
- Rent-specific pricing model on projects beyond `listing_type` (part of the
  broader rental-layer work).

## 3. Schema (proposed) — follows existing conventions

All idempotent (`create table if not exists`, `add column if not exists`,
guarded policies), `*_chk` named constraints, `idx_*` indexes, `updated_at`
trigger registration, RLS helpers reused.

### 3.1 `projects.listing_type` (shared dependency)

```sql
alter table public.projects
  add column if not exists listing_type text not null default 'for_sale';

-- add to projects via a guarded constraint
alter table public.projects drop constraint if exists projects_listing_type_chk;
alter table public.projects add constraint projects_listing_type_chk
  check (listing_type in ('for_sale', 'for_rent', 'mixed_use'));

create index if not exists idx_projects_listing_type on public.projects (listing_type);
```

Note: rent pricing reuse (`price_from_public`/`price_to_public` read as monthly
for `for_rent`) is a rental-layer decision — see Open Question Q2.

### 3.2 `worksheets` — reusable client profile (agent-owned)

```sql
create table if not exists public.worksheets (
  id                   uuid primary key default gen_random_uuid(),
  owner_profile_id     uuid not null references public.profiles (id) on delete cascade,
  worksheet_type       text not null default 'purchase',
  label                text,                 -- agent's internal nickname
  -- client identity (PII — see Q1 on developer exposure)
  client_first_name    text,
  client_last_name     text,
  client_email         text,
  client_phone         text,
  -- shared preferences
  desired_beds_min     numeric(3,1),
  desired_beds_max     numeric(3,1),
  desired_baths_min    numeric(3,1),
  preferred_unit_types text[],               -- {condo, townhome, ...}
  parking_required     boolean,
  locker_required      boolean,
  desired_move_in_date date,
  notes                text,
  -- purchase-specific
  budget_min           numeric(12,2),
  budget_max           numeric(12,2),
  deposit_ready_amount numeric(12,2),
  financing_status     text,                 -- not_started|pre_qualified|pre_approved|cash
  -- rental-specific
  rent_budget_min      numeric(12,2),        -- monthly
  rent_budget_max      numeric(12,2),
  annual_household_income numeric(12,2),
  credit_band          text,                 -- excellent|good|fair|poor|unknown
  lease_term_months    integer,
  num_occupants        integer,
  has_pets             boolean,
  -- meta
  status               text not null default 'active',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint worksheets_type_chk   check (worksheet_type in ('purchase','rental')),
  constraint worksheets_status_chk check (status in ('active','archived')),
  constraint worksheets_financing_chk
    check (financing_status is null or financing_status in
      ('not_started','pre_qualified','pre_approved','cash')),
  constraint worksheets_credit_chk
    check (credit_band is null or credit_band in
      ('excellent','good','fair','poor','unknown'))
);
create index if not exists idx_worksheets_owner  on public.worksheets (owner_profile_id);
create index if not exists idx_worksheets_type   on public.worksheets (worksheet_type);
create index if not exists idx_worksheets_status on public.worksheets (status);
```

### 3.3 `worksheet_submissions` — worksheet → project, with lifecycle

```sql
create table if not exists public.worksheet_submissions (
  id                      uuid primary key default gen_random_uuid(),
  worksheet_id            uuid not null references public.worksheets (id) on delete cascade,
  project_id              uuid not null references public.projects (id) on delete cascade,
  floorplan_id            uuid references public.project_floorplans (id) on delete set null,
  submitted_by_profile_id uuid not null references public.profiles (id) on delete set null,
  submitting_brokerage_id uuid references public.brokerages (id) on delete set null, -- payout routing (TRESA)
  submission_kind         text not null default 'purchase_worksheet',
  snapshot                jsonb not null default '{}'::jsonb,  -- immutable copy at submit time
  -- offer terms (sale)
  offered_price           numeric(12,2),
  requested_incentives    text,
  message                 text,
  -- referral attribution (lease)
  matched_terms           boolean,             -- passed accepted-referral params?
  referral_fee_quoted     text,                -- snapshot of terms shown to agent
  lead_id                 uuid references public.project_leads (id) on delete set null,
  -- lifecycle + review
  status                  text not null default 'submitted',
  developer_response_notes text,
  reviewed_by_profile_id  uuid references public.profiles (id) on delete set null,
  reviewed_at             timestamptz,
  -- payout stub (ledger deferred)
  payout_status           text not null default 'none',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint worksheet_submissions_kind_chk
    check (submission_kind in ('purchase_worksheet','rental_referral')),
  constraint worksheet_submissions_status_chk
    check (status in
      ('submitted','received','under_review','allocated','leased',
       'waitlisted','declined','withdrawn')),
  constraint worksheet_submissions_payout_chk
    check (payout_status in ('none','eligible','invoiced','paid','void')),
  constraint worksheet_submissions_unique unique (worksheet_id, project_id)
);
create index if not exists idx_ws_subs_worksheet on public.worksheet_submissions (worksheet_id);
create index if not exists idx_ws_subs_project   on public.worksheet_submissions (project_id);
create index if not exists idx_ws_subs_owner     on public.worksheet_submissions (submitted_by_profile_id);
create index if not exists idx_ws_subs_status    on public.worksheet_submissions (status);
```

### 3.4 `project_referral_terms` — accepted parameters + fee (1:1, mirrors `project_private_commercials`)

```sql
create table if not exists public.project_referral_terms (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects (id) on delete cascade,
  accepts_referrals     boolean not null default false,
  -- fee
  referral_fee_type     text,                 -- months_rent|percent_first_year|flat
  referral_fee_value    numeric(12,2),
  referral_fee_notes    text,                 -- public-safe blurb
  payout_terms          text,                 -- "30 days after lease start, brokerage-to-brokerage"
  -- acceptance parameters (the validation gate)
  min_lease_term_months integer,
  min_household_income  numeric(12,2),
  min_credit_band       text,                 -- excellent|good|fair|poor|unknown
  pets_allowed          boolean,
  earliest_move_in      date,
  latest_move_in        date,
  required_fields       text[],               -- worksheet fields that must be present
  -- routing to the operator's in-house leasing contact
  routes_to_profile_id  uuid references public.profiles (id) on delete set null,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint project_referral_terms_project_unique unique (project_id),
  constraint project_referral_terms_fee_type_chk
    check (referral_fee_type is null or referral_fee_type in
      ('months_rent','percent_first_year','flat')),
  constraint project_referral_terms_credit_chk
    check (min_credit_band is null or min_credit_band in
      ('excellent','good','fair','poor','unknown'))
);
create index if not exists idx_referral_terms_project on public.project_referral_terms (project_id);
create index if not exists idx_referral_terms_active  on public.project_referral_terms (accepts_referrals, is_active);
```

### 3.5 Validation helper + agent-facing feed view

```sql
-- Does a worksheet satisfy a project's accepted-referral parameters?
create or replace function public.worksheet_matches_referral_terms(
  p_worksheet_id uuid, p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when t.id is null or t.accepts_referrals is not true or t.is_active is not true
      then false
    else
      coalesce(w.lease_term_months   >= t.min_lease_term_months, t.min_lease_term_months is null)
      and coalesce(w.annual_household_income >= t.min_household_income, t.min_household_income is null)
      and coalesce(t.pets_allowed or w.has_pets is not true, t.pets_allowed is null)
      and coalesce(w.desired_move_in_date between
            coalesce(t.earliest_move_in, w.desired_move_in_date)
            and coalesce(t.latest_move_in, w.desired_move_in_date), true)
      -- credit_band ordinal check handled in app/SQL helper (omitted here for brevity)
  end
  from public.worksheets w
  left join public.project_referral_terms t on t.project_id = p_project_id
  where w.id = p_worksheet_id;
$$;

-- Public-safe feed: published rental projects currently paying for referrals.
create or replace view public.referral_opportunities_view as
select
  p.id                 as project_id,
  p.project_name       as project_name,
  p.city               as city,
  p.neighbourhood      as neighbourhood,
  p.hero_image_url     as hero_image_url,
  t.referral_fee_type  as referral_fee_type,
  t.referral_fee_value as referral_fee_value,
  t.referral_fee_notes as referral_fee_notes,
  t.min_lease_term_months as min_lease_term_months,
  t.min_credit_band    as min_credit_band,
  t.pets_allowed       as pets_allowed
from public.projects p
join public.project_referral_terms t on t.project_id = p.id
where p.listing_type in ('for_rent','mixed_use')
  and p.record_status = 'published'
  and t.accepts_referrals = true
  and t.is_active = true;
```

## 4. Reuse of existing tables (no new copies)

| Need | Reuses |
|------|--------|
| Unit being requested | `project_floorplans` (beds/baths/sqft/availability) |
| Generated inquiry | `project_leads` (link via `worksheet_submissions.lead_id`) |
| Developer sees their inbox | `project_access_grants` + `has_project_access(project_id,'developer_restricted')` |
| Who can act | `is_admin()`, `is_approved()` helpers |
| In-house leasing contact | `public_project_pages.assigned_realtor_profile_id` pattern / `routes_to_profile_id` |
| Payout routing (TRESA) | `brokerages` (`submitting_brokerage_id`) |

## 5. RLS (follows the 0002 patterns)

- **`worksheets`** — owner-private. `select/insert/update/delete` where
  `owner_profile_id = auth.uid() or is_admin()`. Insert restricted to approved
  realtors (`is_approved()`). Client PII never leaves the owner+admin boundary
  except through a controlled submission projection (Q1).
- **`worksheet_submissions`** —
  - `select`: `submitted_by_profile_id = auth.uid()` (agent tracks own) OR
    `is_admin()` OR developer with `has_project_access(project_id,'developer_restricted')`
    (their inbox).
  - `insert`: approved realtor, `with check` they own the worksheet and
    `submitted_by_profile_id = auth.uid()`.
  - `update`: admin; developer (status transitions on their project, via grant);
    owner (only `withdrawn`). Enforce allowed transitions in app/server action.
  - `delete`: admin only.
- **`project_referral_terms`** — `select` for `is_admin() or is_approved()`
  (agents need to see terms); write admin-only in v1.
- Grant `select on public.referral_opportunities_view to authenticated`.

## 6. App surfaces (Next.js App Router)

- `dashboard/worksheets/` — agent's library (list, create, edit, archive).
- `dashboard/worksheets/[id]/submit/` — pick project(s) + floorplan; live
  validation against `project_referral_terms`; one-click multi-submit.
- `dashboard/submissions/` — track statuses across all submissions.
- `dashboard/referrals/` — the `referral_opportunities_view` feed (who's paying).
- Developer side (`dashboard/developer/inbox/`) — incoming submissions for their
  granted projects; accept / waitlist / decline / mark leased.
- Admin — manage `project_referral_terms` inside the existing project editor;
  oversee submissions; payout status.

## 7. TS types to add (`src/lib/types.ts`)

`WorksheetType`, `WorksheetStatus`, `Worksheet`, `WorksheetSubmissionStatus`,
`WorksheetSubmission`, `ReferralFeeType`, `ProjectReferralTerms`,
`ReferralOpportunity` — mirroring the columns above, same style as the existing
minimal interfaces.

## 8. Migration plan (matches `supabase/migrations` numbering)

- `0004_worksheets.sql` — structural: `listing_type`, the three tables, indexes,
  `updated_at` triggers, validation helper, `referral_opportunities_view`.
- `0005_worksheets_rls.sql` — enable RLS, grants, policies per §5.
- Update `supabase/README.md` run order + `seed.sql` smoke fixtures.

## 9. Open questions to pressure-test (need your call)

- **Q1 — Client PII to developers.** On a rental referral, does the operator's
  leasing team see full client contact at submission, or a masked profile until
  they accept? (Privacy vs. friction. Recommend: masked until accepted, then
  reveal — and log the reveal.)
- **Q2 — Rent pricing model.** Reuse `price_from_public/to` as monthly for
  `for_rent`, or add an explicit `price_period`? (Affects the feed + worksheet
  budget matching.)
- **Q3 — Developer self-serve.** v1 admin-manages `project_referral_terms` and
  status transitions, or do we let granted developers edit their own terms /
  work their inbox now?
- **Q4 — Resubmission.** One submission per (worksheet, project) — or allow a
  re-submit after a decline?
- **Q5 — Auto-lead.** Create a `project_leads` row automatically on every
  submission (unifies reporting), or only link when one already exists?
- **Q6 — Payout depth in v1.** Stub `payout_status` only (recommended), or build
  the brokerage-to-brokerage payout ledger now?

## 10. Why this order

Ship the worksheet CRUD + submission + referral-terms validation first — it's
useful on its own (agent CRM + allocation tool) and is exactly the artifact we
can walk into a PBR operator with ("agents are already routing matched, qualified
referrals — here's the dashboard, pay per signed lease"). Payments/billing come
once we see real submission volume.
