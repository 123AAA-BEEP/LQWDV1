-- =============================================================================
-- LIQWD — Migration 0004: Advertiser flag + similar-properties controls
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds the monetization lever behind the public project page's
--   "similar / competing properties" module:
--     * projects.is_advertiser         — is this developer a PAYING advertiser?
--     * projects.show_similar_override — admin override (null = auto)
--   and surfaces both — plus a derived `show_similar_block` — through the
--   public-safe `public_projects_view` so the public page can decide whether to
--   show competing inventory at the bottom of the page.
--
--   Business rule (the "deal"):
--     - Paying advertisers get a clean page: competing properties are SUPPRESSED.
--     - Free listings monetize by default: competing (preferably paying)
--       properties are surfaced at the bottom, redirecting the lead.
--   Effective visibility = COALESCE(show_similar_override, NOT is_advertiser).
--   Admins can force the block on/off per property via show_similar_override.
--
-- EXECUTION ORDER
--   Run AFTER 0001–0003. Run as its own query in the Supabase SQL Editor.
--
-- SAFE TO RE-RUN?
--   Yes. Uses ADD COLUMN IF NOT EXISTS and CREATE OR REPLACE VIEW.
-- =============================================================================

-- 1. New commercial flags on projects ----------------------------------------
alter table public.projects
  add column if not exists is_advertiser boolean not null default false;

alter table public.projects
  add column if not exists show_similar_override boolean;

comment on column public.projects.is_advertiser is
  'Paying advertiser. When true, competing "similar properties" are suppressed on the public page by default.';
comment on column public.projects.show_similar_override is
  'Admin override for the similar-properties block: null = auto (derive from is_advertiser), true = always show, false = always hide.';

-- Helps the "similar nearby, advertisers first" query order published rows.
create index if not exists idx_projects_is_advertiser
  on public.projects (is_advertiser)
  where public_page_enabled = true and record_status = 'published';

-- 2. Recreate the public view with the new public-safe columns ----------------
--    (CREATE OR REPLACE appends the new columns; full definition reproduced.)
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
  p.website_url                  as website_url,
  -- New public-safe columns (appended) --------------------------------------
  p.is_featured                  as is_featured,
  p.is_advertiser                as is_advertiser,
  coalesce(p.show_similar_override, not p.is_advertiser) as show_similar_block
from public.public_project_pages pp
join public.projects p on p.id = pp.project_id
where pp.is_active = true
  and p.public_page_enabled = true
  and p.record_status = 'published';

-- =============================================================================
-- End of migration 0004.
-- =============================================================================
