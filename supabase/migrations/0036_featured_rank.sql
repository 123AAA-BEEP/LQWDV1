-- 0036_featured_rank.sql
-- Deterministic "pin to the top of the fold" ordering for projects.
--
-- is_featured already floats a project into the public featured strip and above
-- the organic grid, but every featured project tie-breaks by published_at — so
-- there's no way to say "THIS project sits at the very top." featured_rank adds
-- an explicit manual priority: lower number = higher priority; NULL = unranked
-- (sorts after every ranked project). It is surfaced on BOTH the public and the
-- broker views so the consumer marketplace (/projects) and the realtor dashboard
-- (/dashboard/projects) can order identically — a pinned project leads for
-- everyone. Pairs with is_featured (which still controls the featured strip).

alter table public.projects
  add column if not exists featured_rank integer;

comment on column public.projects.featured_rank is
  'Manual top-of-fold priority. Lower = higher priority; NULL = unranked (sorts last). Pairs with is_featured.';

-- Recreate the public marketplace view, appending featured_rank. CREATE OR
-- REPLACE only permits adding new columns at the END of the select list, so the
-- existing column order is reproduced verbatim and featured_rank is last.
create or replace view public.public_projects_view as
 SELECT p.id AS project_id,
    pp.id AS public_page_id,
    pp.slug,
    pp.indexable,
    COALESCE(pp.seo_title, pp.page_title, p.project_name) AS seo_title,
    pp.seo_meta_description,
    pp.page_title,
    pp.page_summary,
    COALESCE(pp.page_description, p.description_long, p.description_short) AS page_description,
    pp.canonical_url,
    pp.custom_cta_text,
    pp.assigned_realtor_profile_id,
    pp.published_at,
    p.project_name,
    p.project_name_alt,
    p.headline,
    p.description_short,
    p.description_long,
    p.project_type,
    p.construction_status,
    p.sales_status,
    p.ownership_type,
    p.builder_name,
    p.architect_name,
    p.interior_designer_name,
    p.address_full,
    p.city,
    p.municipality,
    p.province,
    p.postal_code,
    p.neighbourhood,
    p.intersection_primary,
    p.intersection_secondary,
    p.latitude,
    p.longitude,
    p.occupancy_estimate_text,
    p.occupancy_start_date,
    p.occupancy_end_date,
    p.storeys,
    p.total_units,
    p.bedrooms_summary,
    p.bathrooms_summary,
    p.size_range_sqft_min,
    p.size_range_sqft_max,
    p.price_from_public,
    p.price_to_public,
    p.price_currency,
    COALESCE(pp.hero_image_url_override, p.hero_image_url) AS hero_image_url,
    p.hero_image_alt,
    p.cover_image_url,
    p.sales_centre_name,
    p.sales_centre_address,
    p.sales_centre_phone,
    p.sales_centre_email,
    p.sales_centre_hours,
    p.website_url,
    p.is_featured,
    p.is_advertiser,
    COALESCE(p.show_similar_override, NOT p.is_advertiser) AS show_similar_block,
    pp.section_intro,
    pp.section_amenities,
    pp.section_getting_around,
    pp.section_developer,
    pp.neighbourhood_features,
    pp.neighbourhood_home_stats,
    p.featured_rank
   FROM public_project_pages pp
     JOIN projects p ON p.id = pp.project_id
  WHERE pp.is_active = true AND p.public_page_enabled = true AND p.record_status = 'published'::text;

-- Recreate the broker view, appending featured_rank (same constraint).
create or replace view public.broker_projects_view as
 SELECT id,
    slug,
    project_name,
    project_name_alt,
    headline,
    description_short,
    description_long,
    project_type,
    construction_status,
    sales_status,
    ownership_type,
    builder_name,
    architect_name,
    interior_designer_name,
    address_full,
    address_line_1,
    address_line_2,
    city,
    municipality,
    province,
    postal_code,
    neighbourhood,
    intersection_primary,
    intersection_secondary,
    latitude,
    longitude,
    occupancy_estimate_text,
    occupancy_start_date,
    occupancy_end_date,
    storeys,
    total_units,
    bedrooms_summary,
    bathrooms_summary,
    size_range_sqft_min,
    size_range_sqft_max,
    price_from_public,
    price_to_public,
    price_currency,
    hero_image_url,
    hero_image_alt,
    cover_image_url,
    sales_centre_name,
    sales_centre_address,
    sales_centre_phone,
    sales_centre_email,
    sales_centre_hours,
    website_url,
    public_page_enabled,
    is_featured,
    is_seeded,
    record_status,
    last_verified_at,
    created_at,
    updated_at,
    published_at,
    featured_rank
   FROM projects p
  WHERE is_approved() OR is_admin();

-- Pin Riverbank Place (the live published record; the older Mississauga-slug row
-- is archived) to the very top of the fold everywhere.
update public.projects
   set is_featured = true,
       featured_rank = 1
 where id = '5bc8575b-ae5e-5e3b-9a21-7128ae5461b0';
