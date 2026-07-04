-- 0059: Trust-weighted browse ranking + admin-curated "hot" flag.
-- The homepage grid favours listings the audit machine verified clean and
-- listings the team marks hot. Rank semantics:
--   audit_rank 2 = audited ok at high confidence, 1 = not yet audited
--   (default), 0 = audited with issues / low-confidence critical (still
--   published, but sinks until fixed). High-confidence criticals get
--   unpublished by the runner and never rank at all.

alter table public.projects
  add column if not exists is_hot boolean not null default false;

alter table public.projects
  add column if not exists audit_rank smallint not null default 1;

-- CREATE OR REPLACE requires appending new columns at the END — column order
-- here mirrors the live view (0055) exactly, plus is_hot + audit_rank.
create or replace view public.public_projects_view as
select
  p.id as project_id,
  pp.id as public_page_id,
  pp.slug,
  pp.indexable,
  coalesce(pp.seo_title, pp.page_title, p.project_name) as seo_title,
  pp.seo_meta_description,
  pp.page_title,
  pp.page_summary,
  coalesce(pp.page_description, p.description_long, p.description_short) as page_description,
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
  coalesce(pp.hero_image_url_override, p.hero_image_url) as hero_image_url,
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
  coalesce(p.show_similar_override, not p.is_advertiser) as show_similar_block,
  pp.section_intro,
  pp.section_amenities,
  pp.section_getting_around,
  pp.section_developer,
  pp.neighbourhood_features,
  pp.neighbourhood_home_stats,
  p.featured_rank,
  pp.section_faq,
  pp.section_buying,
  pp.updated_at as page_updated_at,
  p.listing_type,
  p.price_period,
  p.is_hot,
  p.audit_rank
from public_project_pages pp
join projects p on p.id = pp.project_id
where pp.is_active = true
  and p.public_page_enabled = true
  and p.record_status = 'published';
