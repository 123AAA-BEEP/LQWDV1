-- =============================================================================
-- LIQWD — Migration 0001: Structural Schema
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Creates the full LIQWD data model: tables, constraints, indexes,
--   the shared updated_at trigger function + triggers, and the two public-safe
--   definer views (public_projects_view, public_realtor_cards).
--   Source of truth: liqwd_supabase_schema_prompt_v2.md
--
-- EXECUTION ORDER
--   1) 0001_structural.sql      <-- this file (run FIRST)
--   2) 0002_rls_policies.sql
--   3) 0003_storage.sql
--   4) seed.sql                 (optional smoke-test data)
--
-- PREREQUISITES
--   A fresh Supabase Postgres project. The auth schema (auth.users) must exist
--   (it always does on Supabase). No other prerequisites.
--
-- SAFE TO RE-RUN?
--   Yes. Uses CREATE ... IF NOT EXISTS, CREATE OR REPLACE, and guarded trigger
--   (re)creation. Re-running will not drop data or error on existing objects.
--
-- NOTES
--   - public_projects_view and public_realtor_cards are intentionally DEFINER
--     views (they bypass the RLS of the underlying tables and expose only
--     public-safe columns). Supabase's linter will flag them as
--     "security definer view" — that is expected and intentional.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Reusable updated_at trigger function -----------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. brokerages ---------------------------------------------------------------
create table if not exists public.brokerages (
  id                 uuid primary key default gen_random_uuid(),
  brokerage_name     text not null,
  brokerage_slug     text not null unique,
  brokerage_logo_url text,
  website_url        text,
  phone              text,
  city               text,
  province           text default 'Ontario',
  is_verified        boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_brokerages_name on public.brokerages (brokerage_name);

-- 2. profiles -----------------------------------------------------------------
create table if not exists public.profiles (
  id                        uuid primary key references auth.users (id) on delete cascade,
  role                      text not null default 'realtor',
  first_name                text,
  last_name                 text,
  display_name              text,
  title                     text,                 -- public-safe realtor designation
  email                     text,
  phone                     text,
  brokerage_id              uuid references public.brokerages (id) on delete set null,
  brokerage_name            text,
  reco_registration_number  text,
  verification_status       text not null default 'pending',
  avatar_url                text,
  logo_url                  text,
  bio_short                 text,
  service_area              text,
  is_public_profile_enabled boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint profiles_role_chk
    check (role in ('admin', 'realtor', 'developer')),
  constraint profiles_verification_status_chk
    check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  constraint profiles_title_chk
    check (title is null or title in ('sales_representative', 'broker', 'broker_of_record'))
);
create index if not exists idx_profiles_role         on public.profiles (role);
create index if not exists idx_profiles_verification on public.profiles (verification_status);
create index if not exists idx_profiles_brokerage_id on public.profiles (brokerage_id);
create index if not exists idx_profiles_public       on public.profiles (is_public_profile_enabled);

-- 3. verification_requests ----------------------------------------------------
create table if not exists public.verification_requests (
  id                       uuid primary key default gen_random_uuid(),
  profile_id               uuid not null references public.profiles (id) on delete cascade,
  reco_registration_number text not null,
  brokerage_name_submitted text,
  notes                    text,
  status                   text not null default 'pending',
  reviewed_by_user_id      uuid references public.profiles (id) on delete set null,
  reviewed_at              timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint verification_requests_status_chk
    check (status in ('pending', 'approved', 'rejected', 'suspended'))
);
create index if not exists idx_verification_requests_profile_id on public.verification_requests (profile_id);
create index if not exists idx_verification_requests_status     on public.verification_requests (status);

-- 4. projects -----------------------------------------------------------------
create table if not exists public.projects (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  project_name           text not null,
  project_name_alt       text,
  headline               text,
  description_short      text,
  description_long       text,
  description_ai_draft   text,
  project_type           text,
  construction_status    text,
  sales_status           text,
  ownership_type         text,
  builder_name           text,
  builder_names_raw      text,
  architect_name         text,
  interior_designer_name text,
  address_full           text,
  address_line_1         text,
  address_line_2         text,
  city                   text not null,
  municipality           text,
  province               text not null default 'Ontario',
  postal_code            text,
  neighbourhood          text,
  intersection_primary   text,
  intersection_secondary text,
  latitude               numeric(9,6),
  longitude              numeric(9,6),
  occupancy_estimate_text text,
  occupancy_start_date   date,
  occupancy_end_date     date,
  storeys                integer,
  total_units            integer,
  bedrooms_summary       text,
  bathrooms_summary      text,
  size_range_sqft_min    integer,
  size_range_sqft_max    integer,
  price_from_public      numeric(12,2),
  price_to_public        numeric(12,2),
  price_currency         text default 'CAD',
  hero_image_url         text,
  hero_image_alt         text,
  cover_image_url        text,
  sales_centre_name      text,
  sales_centre_address   text,
  sales_centre_phone     text,
  sales_centre_email     text,
  sales_centre_hours     text,
  website_url            text,
  public_page_enabled    boolean not null default false,
  is_featured            boolean not null default false,
  is_seeded              boolean not null default false,
  record_status          text not null default 'draft',
  last_verified_at       timestamptz,
  external_source        text,
  external_source_url    text,
  import_notes           text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  published_at           timestamptz,
  constraint projects_record_status_chk
    check (record_status in ('draft', 'pending_review', 'approved', 'published', 'archived')),
  constraint projects_sales_status_chk
    check (sales_status is null or sales_status in
      ('coming_soon', 'selling', 'paused', 'sold_out', 'completed', 'unknown')),
  constraint projects_construction_status_chk
    check (construction_status is null or construction_status in
      ('preconstruction', 'under_construction', 'completed', 'unknown'))
);
create index if not exists idx_projects_record_status       on public.projects (record_status);
create index if not exists idx_projects_city                on public.projects (city);
create index if not exists idx_projects_public_page_enabled on public.projects (public_page_enabled);
create index if not exists idx_projects_sales_status        on public.projects (sales_status);

-- 5. project_private_commercials ----------------------------------------------
create table if not exists public.project_private_commercials (
  id                        uuid primary key default gen_random_uuid(),
  project_id                uuid not null references public.projects (id) on delete cascade,
  commission_summary        text,
  commission_percent        numeric(5,2),
  commission_is_negotiable  boolean,
  price_is_negotiable       boolean,
  incentives_are_negotiable boolean,
  negotiability_notes       text,
  private_incentive_notes   text,
  internal_pricing_notes    text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint project_private_commercials_project_unique unique (project_id)
);

-- 6. project_broker_portals ---------------------------------------------------
create table if not exists public.project_broker_portals (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  portal_name         text not null,
  portal_type         text not null,
  url                 text,
  file_url            text,
  access_notes        text,
  is_primary          boolean not null default false,
  is_active           boolean not null default true,
  added_by_user_id    uuid references public.profiles (id) on delete set null,
  approved_by_user_id uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint project_broker_portals_type_chk
    check (portal_type in
      ('external_url', 'drive_folder', 'pdf', 'internal_file', 'login_page', 'other'))
);
create index if not exists idx_broker_portals_project_id on public.project_broker_portals (project_id);

-- 7. project_media  (created_at only) -----------------------------------------
create table if not exists public.project_media (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  media_type  text not null,
  url         text not null,
  alt_text    text,
  caption     text,
  sort_order  integer not null default 0,
  is_public   boolean not null default true,
  source_url  text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_project_media_project_id on public.project_media (project_id);
create index if not exists idx_project_media_is_public  on public.project_media (is_public);

-- 8. project_floorplans -------------------------------------------------------
create table if not exists public.project_floorplans (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  plan_name           text,
  unit_type           text,
  beds                numeric(3,1),
  baths               numeric(3,1),
  powder_rooms        integer,
  sqft_interior       integer,
  sqft_exterior       integer,
  price_public        numeric(12,2),
  price_internal      numeric(12,2),
  price_notes         text,
  availability_status text,
  occupancy_text      text,
  floorplan_image_url text,
  is_featured         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_project_floorplans_project_id on public.project_floorplans (project_id);

-- 9. project_incentives -------------------------------------------------------
create table if not exists public.project_incentives (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (id) on delete cascade,
  title                text not null,
  description_public   text,
  description_private  text,
  is_active            boolean not null default true,
  effective_start_date date,
  effective_end_date   date,
  is_negotiable        boolean,
  source_snapshot_id   uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_project_incentives_project_id on public.project_incentives (project_id);

-- 10. project_documents  (created_at only; + uploaded_by_user_id) -------------
create table if not exists public.project_documents (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  document_type       text not null,
  title               text not null,
  file_url            text not null,
  public_url          text,
  is_public           boolean not null default false,
  source_type         text not null,
  snapshot_date       date,
  notes               text,
  uploaded_by_user_id uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists idx_project_documents_project_id  on public.project_documents (project_id);
create index if not exists idx_project_documents_is_public   on public.project_documents (is_public);
create index if not exists idx_project_documents_uploaded_by on public.project_documents (uploaded_by_user_id);

-- 11. public_project_pages ----------------------------------------------------
create table if not exists public.public_project_pages (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid not null references public.projects (id) on delete cascade,
  slug                        text not null unique,
  is_active                   boolean not null default false,
  indexable                   boolean not null default false,
  page_title                  text,
  page_summary                text,
  page_description            text,
  seo_title                   text,
  seo_meta_description        text,
  canonical_url               text,
  hero_image_url_override     text,
  custom_cta_text             text,
  assigned_realtor_profile_id uuid references public.profiles (id) on delete set null,
  lead_routing_mode           text not null default 'admin',
  published_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint public_project_pages_lead_routing_chk
    check (lead_routing_mode in ('admin', 'assigned_realtor', 'shared_pool'))
);
create index if not exists idx_public_pages_project_id on public.public_project_pages (project_id);
create index if not exists idx_public_pages_is_active  on public.public_project_pages (is_active);
create index if not exists idx_public_pages_assigned   on public.public_project_pages (assigned_realtor_profile_id);

-- 12. project_leads  (created_at only) ----------------------------------------
create table if not exists public.project_leads (
  id                          uuid primary key default gen_random_uuid(),
  project_id                  uuid not null references public.projects (id) on delete cascade,
  public_project_page_id      uuid references public.public_project_pages (id) on delete set null,
  assigned_realtor_profile_id uuid references public.profiles (id) on delete set null,
  lead_name                   text not null,
  lead_email                  text not null,
  lead_phone                  text,
  is_realtor                  boolean,
  message                     text,
  source_url                  text,
  status                      text not null default 'new',
  created_at                  timestamptz not null default now(),
  constraint project_leads_status_chk
    check (status in ('new', 'contacted', 'qualified', 'closed', 'spam'))
);
create index if not exists idx_project_leads_project_id on public.project_leads (project_id);
create index if not exists idx_project_leads_status     on public.project_leads (status);
create index if not exists idx_project_leads_assigned   on public.project_leads (assigned_realtor_profile_id);

-- 13. project_access_grants  (granted_at only) --------------------------------
create table if not exists public.project_access_grants (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  user_id            uuid not null references public.profiles (id) on delete cascade,
  access_role        text not null,
  granted_by_user_id uuid references public.profiles (id) on delete set null,
  granted_at         timestamptz not null default now(),
  expires_at         timestamptz,
  is_active          boolean not null default true,
  constraint project_access_grants_unique unique (project_id, user_id, access_role),
  constraint project_access_grants_role_chk
    check (access_role in ('realtor_only', 'developer_restricted', 'admin_only'))
);
create index if not exists idx_access_grants_project_id on public.project_access_grants (project_id);
create index if not exists idx_access_grants_user_id    on public.project_access_grants (user_id);

-- 14. property_submissions ----------------------------------------------------
create table if not exists public.property_submissions (
  id                   uuid primary key default gen_random_uuid(),
  submitted_by_user_id uuid not null references public.profiles (id),
  project_name         text not null,
  builder_name         text,
  city                 text,
  address_text         text,
  submission_payload   jsonb not null default '{}'::jsonb,
  status               text not null default 'pending_review',
  admin_notes          text,
  reviewed_by_user_id  uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint property_submissions_status_chk
    check (status in ('draft', 'pending_review', 'needs_changes', 'approved', 'rejected'))
);
create index if not exists idx_property_submissions_submitted_by on public.property_submissions (submitted_by_user_id);
create index if not exists idx_property_submissions_status       on public.property_submissions (status);

-- 15. property_update_requests ------------------------------------------------
create table if not exists public.property_update_requests (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (id) on delete cascade,
  submitted_by_user_id uuid not null references public.profiles (id),
  update_type          text not null,
  update_payload       jsonb not null default '{}'::jsonb,
  status               text not null default 'pending_review',
  admin_notes          text,
  reviewed_by_user_id  uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint property_update_requests_status_chk
    check (status in ('pending_review', 'needs_changes', 'approved', 'rejected'))
);
create index if not exists idx_property_update_requests_project_id   on public.property_update_requests (project_id);
create index if not exists idx_property_update_requests_submitted_by on public.property_update_requests (submitted_by_user_id);
create index if not exists idx_property_update_requests_status       on public.property_update_requests (status);

-- 16. audit_logs  (created_at only) -------------------------------------------
create table if not exists public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id) on delete set null,
  entity_type   text not null,
  entity_id     uuid,
  action        text not null,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_logs_actor   on public.audit_logs (actor_user_id);
create index if not exists idx_audit_logs_entity  on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_created on public.audit_logs (created_at);

-- 17. updated_at triggers (only tables that have updated_at) -------------------
do $$
declare
  t text;
  tables text[] := array[
    'brokerages', 'profiles', 'verification_requests', 'projects',
    'project_private_commercials', 'project_broker_portals',
    'project_floorplans', 'project_incentives', 'public_project_pages',
    'property_submissions', 'property_update_requests'
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

-- 18. public_projects_view  (definer view = sole public project gateway) ------
create or replace view public.public_projects_view as
select
  p.id                           as project_id,
  pp.id                          as public_page_id,
  pp.slug                        as slug,
  pp.indexable                   as indexable,
  coalesce(pp.seo_title, pp.page_title, p.project_name) as seo_title,
  pp.seo_meta_description        as seo_meta_description,
  pp.page_title                  as page_title,
  pp.page_summary                as page_summary,
  coalesce(pp.page_description, p.description_long, p.description_short) as page_description,
  pp.canonical_url               as canonical_url,
  pp.custom_cta_text             as custom_cta_text,
  pp.assigned_realtor_profile_id as assigned_realtor_profile_id,
  pp.published_at                as published_at,
  p.project_name                 as project_name,
  p.project_name_alt             as project_name_alt,
  p.headline                     as headline,
  p.description_short            as description_short,
  p.description_long             as description_long,
  p.project_type                 as project_type,
  p.construction_status          as construction_status,
  p.sales_status                 as sales_status,
  p.ownership_type               as ownership_type,
  p.builder_name                 as builder_name,
  p.architect_name               as architect_name,
  p.interior_designer_name       as interior_designer_name,
  p.address_full                 as address_full,
  p.city                         as city,
  p.municipality                 as municipality,
  p.province                     as province,
  p.postal_code                  as postal_code,
  p.neighbourhood                as neighbourhood,
  p.intersection_primary         as intersection_primary,
  p.intersection_secondary       as intersection_secondary,
  p.latitude                     as latitude,
  p.longitude                    as longitude,
  p.occupancy_estimate_text      as occupancy_estimate_text,
  p.occupancy_start_date         as occupancy_start_date,
  p.occupancy_end_date           as occupancy_end_date,
  p.storeys                      as storeys,
  p.total_units                  as total_units,
  p.bedrooms_summary             as bedrooms_summary,
  p.bathrooms_summary            as bathrooms_summary,
  p.size_range_sqft_min          as size_range_sqft_min,
  p.size_range_sqft_max          as size_range_sqft_max,
  p.price_from_public            as price_from_public,
  p.price_to_public              as price_to_public,
  p.price_currency               as price_currency,
  coalesce(pp.hero_image_url_override, p.hero_image_url) as hero_image_url,
  p.hero_image_alt               as hero_image_alt,
  p.cover_image_url              as cover_image_url,
  p.sales_centre_name            as sales_centre_name,
  p.sales_centre_address         as sales_centre_address,
  p.sales_centre_phone           as sales_centre_phone,
  p.sales_centre_email           as sales_centre_email,
  p.sales_centre_hours           as sales_centre_hours,
  p.website_url                  as website_url
from public.public_project_pages pp
join public.projects p on p.id = pp.project_id
where pp.is_active = true
  and p.public_page_enabled = true
  and p.record_status = 'published';

-- 19. public_realtor_cards  (definer view = public-safe realtor layer) --------
--   Exposes ONLY card-safe fields, opted-in + approved realtors only.
create or replace view public.public_realtor_cards as
select
  p.id          as profile_id,
  p.first_name  as first_name,
  p.last_name   as last_name,
  p.title       as title,
  coalesce(b.brokerage_name, p.brokerage_name) as brokerage,
  p.email       as email,   -- optional public field
  p.phone       as phone    -- optional public field
from public.profiles p
left join public.brokerages b on b.id = p.brokerage_id
where p.is_public_profile_enabled = true
  and p.verification_status = 'approved';

-- =============================================================================
-- End of migration 0001.
-- =============================================================================
