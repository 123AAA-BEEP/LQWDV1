-- =============================================================================
-- LIQWD — Migration 0075: public-safe views for floor plans & public brochures
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   The public project page now lists floor plans and admin-flagged public
--   brochures, making the generic page link a complete shareable package.
--   Base-table reads are broker/admin-gated (`project_floorplans` carries the
--   broker-only `price_internal`; `project_documents` is private by default),
--   so — following the same definer-view pattern as `public_projects_view` —
--   these two views expose ONLY public-safe columns, ONLY for projects that
--   are actually live on the public site.
--
--   - public_project_floorplans_view: every floor plan of a live project
--     (plans were always "Public" by design in the admin editor; price_internal
--     is deliberately excluded).
--   - public_project_documents_view: metadata (never file paths) of documents
--     an admin explicitly flipped to `is_public`. Downloads go through
--     /projects/[slug]/docs/[id], which re-checks visibility and mints a
--     short-lived signed URL — the storage bucket stays private.
--
-- EXECUTION ORDER
--   Run after 0074_floorplan_pdf.sql.
-- =============================================================================

create or replace view public.public_project_floorplans_view as
select
  fp.id,
  fp.project_id,
  fp.plan_name,
  fp.unit_type,
  fp.sqft_interior,
  fp.price_public,
  fp.floorplan_image_url
from public.project_floorplans fp
where exists (
  select 1 from public.public_projects_view v
  where v.project_id = fp.project_id
);

create or replace view public.public_project_documents_view as
select
  d.id,
  d.project_id,
  d.title,
  d.document_type
from public.project_documents d
where d.is_public = true
  and exists (
    select 1 from public.public_projects_view v
    where v.project_id = d.project_id
  );

grant select on public.public_project_floorplans_view to anon, authenticated;
grant select on public.public_project_documents_view  to anon, authenticated;
