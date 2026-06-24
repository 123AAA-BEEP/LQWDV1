-- 0033: editorial content sections for public project pages.
--
-- Adds four SEO-friendly long-form sections to the public publishing layer
-- (intro, local amenities, getting around, the developer) and exposes them in
-- public_projects_view so the consumer project page can render them. Content is
-- written by an admin or the AI generator; all four are nullable and the page
-- renders only the ones that are present.

alter table public_project_pages
  add column if not exists section_intro text,
  add column if not exists section_amenities text,
  add column if not exists section_getting_around text,
  add column if not exists section_developer text;

create or replace view public_projects_view as
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
    pp.section_developer
   FROM public_project_pages pp
     JOIN projects p ON p.id = pp.project_id
  WHERE pp.is_active = true AND p.public_page_enabled = true AND p.record_status = 'published'::text;
