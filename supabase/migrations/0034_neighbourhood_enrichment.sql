-- 0034_neighbourhood_enrichment.sql
--
-- Structured "neighbourhood" content for the public project page, the broker
-- project view, and the quick-fact sheet. Nearby features come from
-- OpenStreetMap / Overpass (hospitals, shopping, schools, post-secondary,
-- transit, groceries, parks, points of interest) keyed off the project's
-- latitude/longitude; area-level home stats come from Statistics Canada census;
-- school ranks are layered in from EQAO open data. All public-safe (it is public
-- map/area data), so it lives on public_project_pages alongside the section_*
-- copy, reaching both the public and broker surfaces through the same access
-- path. Populated by the `liqwd-neighbourhood` edge function (service role).

alter table public.public_project_pages
  add column if not exists neighbourhood_features jsonb,
  add column if not exists neighbourhood_home_stats jsonb,
  add column if not exists neighbourhood_updated_at timestamptz;

-- How a project's coordinates were obtained, so auto-geocoded, low-confidence
-- points can be reviewed before they drive published content:
--   'import'        - came from the original data import
--   'geocoded'      - structured geocode, city-validated
--   'geocoded_low'  - geocode could not be city-validated (needs review)
--   'manual'        - hand-verified / hand-set
alter table public.projects
  add column if not exists geo_confidence text;
