-- =============================================================================
-- LIQWD — Migration 0021: Rental dimension, PBR referral terms & suggestions
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES (structural)
--   - projects.listing_type + projects.price_period (sale vs lease pricing)
--   - project_rental_referral_terms: per-project PBR referral parameters + fee.
--     Named distinctly from the platform's existing member-growth `referrals`
--     table (which grants reward days), to avoid confusion.
--   - platform_suggestions: realtor "Got an idea?" inbox.
--   - referral_opportunities_view: broker-only feed (SECURITY INVOKER).
--
-- SCOPE NOTE
--   This intentionally does NOT add a `worksheets` table. The platform already
--   has `buyer_mandates` (a reusable buyer profile) + `mandate_connect_requests`
--   that cover that concept; the rental/PBR work extends what exists rather than
--   duplicating it. See docs/worksheets-and-referrals-design.md.
--
-- EXECUTION ORDER
--   Runs after the existing baseline 0001–0020. This is 0021; its RLS is 0022.
--   Already applied to the live DB as `pbr_rental_referrals_and_suggestions`.
--
-- PREREQUISITES
--   0001–0020 applied (projects, profiles, set_updated_at + helpers).
--
-- SAFE TO RE-RUN?
--   Yes. add column if not exists, drop-then-add named constraints,
--   create ... if not exists, create or replace view, guarded triggers.
--
-- NOTE
--   referral_opportunities_view is SECURITY INVOKER (broker-only): it respects
--   the caller's RLS on projects + project_rental_referral_terms, unlike the
--   public definer views in 0001.
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

-- 2. project_rental_referral_terms — PBR accepted parameters + fee (1:1) -------
create table if not exists public.project_rental_referral_terms (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid not null references public.projects (id) on delete cascade,
  accepts_referrals     boolean not null default false,
  referral_fee_type     text,
  referral_fee_value    numeric(12,2),
  referral_fee_notes    text,
  payout_terms          text,
  min_lease_term_months integer,
  min_household_income  numeric(12,2),
  min_credit_band       text,
  pets_allowed          boolean,
  earliest_move_in      date,
  latest_move_in        date,
  required_fields       text[],
  routes_to_profile_id  uuid references public.profiles (id) on delete set null,
  service_mode          text not null default 'self_serve',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint project_rental_referral_terms_project_unique unique (project_id),
  constraint project_rental_referral_terms_service_mode_chk
    check (service_mode in ('self_serve','full_service')),
  constraint project_rental_referral_terms_fee_type_chk
    check (referral_fee_type is null or referral_fee_type in
      ('months_rent','percent_first_year','flat')),
  constraint project_rental_referral_terms_credit_chk
    check (min_credit_band is null or min_credit_band in
      ('excellent','good','fair','poor','unknown'))
);
create index if not exists idx_rental_referral_terms_project on public.project_rental_referral_terms (project_id);
create index if not exists idx_rental_referral_terms_active  on public.project_rental_referral_terms (accepts_referrals, is_active);

-- 3. platform_suggestions — realtor "Got an idea?" inbox ----------------------
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

-- 4. updated_at triggers ------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array['project_rental_referral_terms', 'platform_suggestions'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- 5. referral_opportunities_view — broker-only feed (SECURITY INVOKER) --------
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
join public.project_rental_referral_terms t on t.project_id = p.id
where p.listing_type in ('for_rent','mixed_use')
  and p.record_status = 'published'
  and t.accepts_referrals = true
  and t.is_active = true;

-- =============================================================================
-- End of migration 0004.
-- =============================================================================
