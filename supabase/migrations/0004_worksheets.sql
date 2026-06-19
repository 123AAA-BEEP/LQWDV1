-- =============================================================================
-- LIQWD — Migration 0004: Worksheets, PBR Referrals & Suggestions (structural)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds the "worksheet" layer (reusable, agent-owned client profiles submitted
--   to projects for sale or lease), the purpose-built-rental referral layer, and
--   the realtor "suggestions" inbox:
--     - projects.listing_type + projects.price_period
--     - project_leads.lead_source (auto-lead discriminator)
--     - worksheets, worksheet_submissions, project_referral_terms,
--       platform_suggestions
--     - helper functions credit_band_rank(), worksheet_matches_referral_terms()
--     - referral_opportunities_view (broker-only, SECURITY INVOKER)
--   Design: docs/worksheets-and-referrals-design.md
--
-- EXECUTION ORDER
--   1) 0001_structural.sql
--   2) 0002_rls_policies.sql
--   3) 0003_storage.sql
--   4) 0004_worksheets.sql       <-- this file
--   5) 0005_worksheets_rls.sql
--   6) seed.sql                  (optional smoke-test data)
--
-- PREREQUISITES
--   0001 applied (projects, project_leads, profiles, brokerages, set_updated_at).
--
-- SAFE TO RE-RUN?
--   Yes. add column if not exists, drop-then-add named constraints,
--   create ... if not exists, create or replace function/view, guarded triggers.
--
-- NOTES
--   - referral_opportunities_view is a SECURITY INVOKER view (unlike the public
--     definer views in 0001): it is broker-only and must respect the caller's
--     RLS on projects + project_referral_terms.
-- =============================================================================

-- 1. projects: listing type + price period ------------------------------------
alter table public.projects
  add column if not exists listing_type text not null default 'for_sale';
alter table public.projects drop constraint if exists projects_listing_type_chk;
alter table public.projects add constraint projects_listing_type_chk
  check (listing_type in ('for_sale', 'for_rent', 'mixed_use'));
create index if not exists idx_projects_listing_type on public.projects (listing_type);

-- price_from_public / price_to_public are reused; price_period disambiguates a
-- one-time sale total ('total') from a monthly rent band ('monthly').
alter table public.projects
  add column if not exists price_period text not null default 'total';
alter table public.projects drop constraint if exists projects_price_period_chk;
alter table public.projects add constraint projects_price_period_chk
  check (price_period in ('total', 'monthly'));

-- 2. project_leads: source discriminator (public form vs worksheet) -----------
alter table public.project_leads
  add column if not exists lead_source text not null default 'public_form';
alter table public.project_leads drop constraint if exists project_leads_source_chk;
alter table public.project_leads add constraint project_leads_source_chk
  check (lead_source in ('public_form', 'worksheet'));
create index if not exists idx_project_leads_source on public.project_leads (lead_source);

-- 3. worksheets — reusable, agent-owned client profiles -----------------------
create table if not exists public.worksheets (
  id                      uuid primary key default gen_random_uuid(),
  owner_profile_id        uuid not null references public.profiles (id) on delete cascade,
  worksheet_type          text not null default 'purchase',
  label                   text,                 -- agent's internal nickname
  -- client identity (PII)
  client_first_name       text,
  client_last_name        text,
  client_email            text,
  client_phone            text,
  -- shared preferences
  desired_beds_min        numeric(3,1),
  desired_beds_max        numeric(3,1),
  desired_baths_min       numeric(3,1),
  preferred_unit_types    text[],
  parking_required        boolean,
  locker_required         boolean,
  desired_move_in_date    date,
  notes                   text,
  -- purchase-specific
  budget_min              numeric(12,2),
  budget_max              numeric(12,2),
  deposit_ready_amount    numeric(12,2),
  financing_status        text,
  -- rental-specific
  rent_budget_min         numeric(12,2),        -- monthly
  rent_budget_max         numeric(12,2),
  annual_household_income numeric(12,2),
  credit_band             text,
  lease_term_months       integer,
  num_occupants           integer,
  has_pets                boolean,
  -- meta
  status                  text not null default 'active',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
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

-- 4. worksheet_submissions — worksheet -> project (+ optional floorplan) -------
create table if not exists public.worksheet_submissions (
  id                       uuid primary key default gen_random_uuid(),
  worksheet_id             uuid not null references public.worksheets (id) on delete cascade,
  project_id               uuid not null references public.projects (id) on delete cascade,
  floorplan_id             uuid references public.project_floorplans (id) on delete set null,
  submitted_by_profile_id  uuid not null references public.profiles (id) on delete set null,
  submitting_brokerage_id  uuid references public.brokerages (id) on delete set null,
  submission_kind          text not null default 'purchase_worksheet',
  snapshot                 jsonb not null default '{}'::jsonb,
  -- offer terms (sale)
  offered_price            numeric(12,2),
  requested_incentives     text,
  message                  text,
  -- referral attribution (lease)
  matched_terms            boolean,
  referral_fee_quoted      text,
  lead_id                  uuid references public.project_leads (id) on delete set null,
  -- lifecycle + review
  status                   text not null default 'submitted',
  developer_response_notes text,
  reviewed_by_profile_id   uuid references public.profiles (id) on delete set null,
  reviewed_at              timestamptz,
  -- payout stub (off-platform invoicing on accepted; ledger deferred)
  payout_status            text not null default 'none',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint worksheet_submissions_kind_chk
    check (submission_kind in ('purchase_worksheet','rental_referral')),
  constraint worksheet_submissions_status_chk
    check (status in
      ('submitted','received','in_progress','client_not_submitting',
       'client_ineligible','accepted','declined','withdrawn')),
  constraint worksheet_submissions_payout_chk
    check (payout_status in ('none','eligible','invoiced','paid','void'))
);
create index if not exists idx_ws_subs_worksheet on public.worksheet_submissions (worksheet_id);
create index if not exists idx_ws_subs_project   on public.worksheet_submissions (project_id);
create index if not exists idx_ws_subs_owner     on public.worksheet_submissions (submitted_by_profile_id);
create index if not exists idx_ws_subs_status    on public.worksheet_submissions (status);

-- Re-submission allowed after a terminal outcome; block only duplicate OPEN
-- submissions (one live attempt per worksheet+project).
create unique index if not exists uq_ws_subs_open
  on public.worksheet_submissions (worksheet_id, project_id)
  where status in ('submitted','received','in_progress');

-- 5. project_referral_terms — accepted parameters + fee (1:1 with projects) ---
create table if not exists public.project_referral_terms (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects (id) on delete cascade,
  accepts_referrals     boolean not null default false,
  -- fee
  referral_fee_type     text,
  referral_fee_value    numeric(12,2),
  referral_fee_notes    text,
  payout_terms          text,
  -- acceptance parameters (validation gate)
  min_lease_term_months integer,
  min_household_income  numeric(12,2),
  min_credit_band       text,
  pets_allowed          boolean,
  earliest_move_in      date,
  latest_move_in        date,
  required_fields       text[],
  -- routing + who works the inbox
  routes_to_profile_id  uuid references public.profiles (id) on delete set null,
  service_mode          text not null default 'self_serve',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint project_referral_terms_project_unique unique (project_id),
  constraint project_referral_terms_service_mode_chk
    check (service_mode in ('self_serve','full_service')),
  constraint project_referral_terms_fee_type_chk
    check (referral_fee_type is null or referral_fee_type in
      ('months_rent','percent_first_year','flat')),
  constraint project_referral_terms_credit_chk
    check (min_credit_band is null or min_credit_band in
      ('excellent','good','fair','poor','unknown'))
);
create index if not exists idx_referral_terms_project on public.project_referral_terms (project_id);
create index if not exists idx_referral_terms_active  on public.project_referral_terms (accepts_referrals, is_active);

-- 6. platform_suggestions — realtor "Got an idea?" inbox ----------------------
create table if not exists public.platform_suggestions (
  id                      uuid primary key default gen_random_uuid(),
  submitted_by_profile_id uuid not null references public.profiles (id) on delete cascade,
  category                text not null default 'idea',
  title                   text not null,
  body                    text,
  open_to_collaborate     boolean not null default false,
  contact_ok              boolean not null default true,
  status                  text not null default 'new',
  public_response         text,
  admin_notes             text,
  reviewed_by_user_id     uuid references public.profiles (id) on delete set null,
  reviewed_at             timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint platform_suggestions_category_chk
    check (category in
      ('idea','feature_request','complaint','business_opportunity','other')),
  constraint platform_suggestions_status_chk
    check (status in
      ('new','under_review','planned','in_progress','shipped','declined'))
);
create index if not exists idx_platform_suggestions_submitter on public.platform_suggestions (submitted_by_profile_id);
create index if not exists idx_platform_suggestions_status    on public.platform_suggestions (status);

-- 7. Helper functions ---------------------------------------------------------
-- Ordinal rank for credit bands (null/unknown = lowest). Immutable.
create or replace function public.credit_band_rank(p text)
returns integer language sql immutable as $$
  select case p
    when 'excellent' then 4
    when 'good'      then 3
    when 'fair'      then 2
    when 'poor'      then 1
    else 0
  end;
$$;

-- Does a worksheet satisfy a project's accepted-referral parameters?
-- Hard criteria (lease term / income / credit) fail when the worksheet value is
-- missing; move-in window is lenient when no date is set. Returns false when the
-- project has no active, referral-accepting terms.
create or replace function public.worksheet_matches_referral_terms(
  p_worksheet_id uuid, p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    t.id is not null
    and t.accepts_referrals is true
    and t.is_active is true
    and (t.min_lease_term_months is null
         or w.lease_term_months >= t.min_lease_term_months)
    and (t.min_household_income is null
         or w.annual_household_income >= t.min_household_income)
    and (t.min_credit_band is null
         or public.credit_band_rank(w.credit_band) >= public.credit_band_rank(t.min_credit_band))
    and (t.pets_allowed is distinct from false or w.has_pets is not true)
    and (t.earliest_move_in is null or w.desired_move_in_date is null
         or w.desired_move_in_date >= t.earliest_move_in)
    and (t.latest_move_in is null or w.desired_move_in_date is null
         or w.desired_move_in_date <= t.latest_move_in),
    false)
  from public.worksheets w
  left join public.project_referral_terms t on t.project_id = p_project_id
  where w.id = p_worksheet_id;
$$;

grant execute on function public.credit_band_rank(text)                       to authenticated;
grant execute on function public.worksheet_matches_referral_terms(uuid, uuid) to authenticated;

-- 8. referral_opportunities_view — broker-only feed of who's paying -----------
--    SECURITY INVOKER: respects the caller's RLS on projects + referral terms
--    (so only approved realtors / admins see rows). Grant is set in 0005.
create or replace view public.referral_opportunities_view
with (security_invoker = true) as
select
  p.id                    as project_id,
  p.project_name          as project_name,
  p.city                  as city,
  p.neighbourhood         as neighbourhood,
  p.hero_image_url        as hero_image_url,
  p.price_from_public     as rent_from,
  p.price_to_public       as rent_to,
  p.price_period          as price_period,
  t.referral_fee_type     as referral_fee_type,
  t.referral_fee_value    as referral_fee_value,
  t.referral_fee_notes    as referral_fee_notes,
  t.min_lease_term_months as min_lease_term_months,
  t.min_credit_band       as min_credit_band,
  t.pets_allowed          as pets_allowed,
  t.service_mode          as service_mode
from public.projects p
join public.project_referral_terms t on t.project_id = p.id
where p.listing_type in ('for_rent','mixed_use')
  and p.record_status = 'published'
  and t.accepts_referrals = true
  and t.is_active = true;

-- 9. updated_at triggers for the new tables -----------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'worksheets', 'worksheet_submissions',
    'project_referral_terms', 'platform_suggestions'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- =============================================================================
-- End of migration 0004.
-- =============================================================================
