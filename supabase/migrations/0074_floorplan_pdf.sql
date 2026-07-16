-- =============================================================================
-- LIQWD — Migration 0074: PDFs are the standard for floorplan uploads
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Allows application/pdf in the public `project-media` bucket. Builders
--   distribute floor plans as PDFs; until now the bucket's MIME allowlist
--   (0003) only accepted png/jpeg/webp, forcing manual conversion before an
--   admin could attach a plan. The floorplan uploader + validator
--   (src/lib/upload.ts FLOORPLAN_MIME) now accept PDF first, images still fine.
--
--   `project_floorplans.floorplan_image_url` keeps its name but may now point
--   at a PDF — consumers render it as a "View plan" link (admin editor +
--   broker project page), never an <img>, so no rendering path breaks.
--
--   Floorplans are public data (the bucket is public-read by design, and the
--   admin editor badges the section "Public") — no access change here, only
--   the accepted format.
--
-- EXECUTION ORDER
--   Run after 0073_lead_status_pipeline.sql.
-- =============================================================================

update storage.buckets
   set allowed_mime_types = array[
     'image/png', 'image/jpeg', 'image/webp', 'application/pdf'
   ]
 where id = 'project-media';
