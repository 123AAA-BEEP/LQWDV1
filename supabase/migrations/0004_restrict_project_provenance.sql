-- =============================================================================
-- LIQWD — Migration 0004: Lock import/source provenance to admins
-- -----------------------------------------------------------------------------
-- WHY
--   The `projects` table carries private import/source-provenance fields that
--   identify the upstream data-source record (e.g. an external data provider's
--   record id / URL). These must NEVER be visible to the public OR to approved
--   realtors — they are ADMIN-ONLY:
--       external_source, external_source_url, import_notes,
--       builder_names_raw, description_ai_draft
--
--   The public surface was already safe: `public_projects_view` does not expose
--   any of these columns. The gap was the BROKER surface — `projects_select`
--   let any approved realtor read the entire base row (including the provenance
--   fields) straight from the REST API, even though no page rendered them.
--
-- WHAT THIS DOES
--   1) Restricts base-table SELECT on `projects` to admins (writes were already
--      admin-only via `projects_admin_write`).
--   2) Adds `broker_projects_view` — a public-schema definer view that exposes
--      every broker-relevant column EXCEPT the private provenance fields, and
--      self-gates to approved realtors (and admins). Approved-realtor app reads
--      now go through this view instead of the base table.
--
-- DEPLOY NOTE
--   This migration and the app code that reads `broker_projects_view` must ship
--   together: once SELECT on the base table is admin-only, realtor pages that
--   still query `projects` directly would return no rows.
--
-- SAFE TO RE-RUN?
--   Yes. Policy is dropped (IF EXISTS) before recreation; the view uses
--   CREATE OR REPLACE.
-- =============================================================================

-- 1. Base table: SELECT is admin-only -----------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated using (public.is_admin());

-- 2. Broker-safe view (definer; self-gated to approved realtors + admins) ------
--    Intentionally OMITS the private provenance fields: external_source,
--    external_source_url, import_notes, builder_names_raw, description_ai_draft.
create or replace view public.broker_projects_view as
select
  p.id,
  p.slug,
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
  p.address_line_1,
  p.address_line_2,
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
  p.hero_image_url,
  p.hero_image_alt,
  p.cover_image_url,
  p.sales_centre_name,
  p.sales_centre_address,
  p.sales_centre_phone,
  p.sales_centre_email,
  p.sales_centre_hours,
  p.website_url,
  p.public_page_enabled,
  p.is_featured,
  p.is_seeded,
  p.record_status,
  p.last_verified_at,
  p.created_at,
  p.updated_at,
  p.published_at
from public.projects p
where public.is_approved() or public.is_admin();

grant select on public.broker_projects_view to authenticated;

-- =============================================================================
-- End of migration 0004.
-- =============================================================================
