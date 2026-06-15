-- =============================================================================
-- LIQWD — Data cleanup 0005: Merge livabl/Altus overlaps + reset commission notes
-- -----------------------------------------------------------------------------
-- Run AFTER the Altus imports (0001–0003). Idempotent / safe to re-run.
--
-- WHY
--   1) The Altus export and the original livabl seed both contain 6 of the same
--      communities (same name + city). The livabl row carried the hero photo;
--      the Altus row carries builder + commission data. We enrich the Altus
--      row with the photo, then drop the redundant livabl row. Genuinely
--      distinct Altus phases (different inventory #) are intentionally kept.
--   2) The importer parked the Altus "cooperation status / sales team" text in
--      project_private_commercials.negotiability_notes. That field is now a
--      manually-managed "Commission notes" surface (admin / verified builder),
--      so we clear the auto-imported text.
-- =============================================================================

begin;

-- 1a. Copy photo/description from each livabl row onto its matching Altus
--     row(s) where the Altus row is missing them (community-level hero).
with liv as (
  select project_name, city, hero_image_url, description_long, description_short
  from public.projects
  where external_source = 'livabl'
    and exists (
      select 1 from public.projects a
      where a.external_source = 'Altus Group'
        and lower(a.project_name) = lower(projects.project_name)
        and lower(coalesce(a.city,'')) = lower(coalesce(projects.city,''))
    )
)
update public.projects a
set hero_image_url    = coalesce(a.hero_image_url, liv.hero_image_url),
    description_long  = coalesce(a.description_long, liv.description_long),
    description_short = coalesce(a.description_short, liv.description_short)
from liv
where a.external_source = 'Altus Group'
  and lower(a.project_name) = lower(liv.project_name)
  and lower(coalesce(a.city,'')) = lower(coalesce(liv.city,''));

-- 1b. Delete the now-redundant livabl rows (child rows cascade).
delete from public.projects p
where p.external_source = 'livabl'
  and exists (
    select 1 from public.projects a
    where a.external_source = 'Altus Group'
      and lower(a.project_name) = lower(p.project_name)
      and lower(coalesce(a.city,'')) = lower(coalesce(p.city,''))
  );

-- 2. Reset auto-imported commission notes so the field is admin/builder-managed.
update public.project_private_commercials
set negotiability_notes = null
where negotiability_notes ilike 'Cooperation status:%';

commit;
