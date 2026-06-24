-- 0029_dedup_projects.sql
--
-- Collapse redundant DRAFT project rows that represent the same offering.
--
-- Context: the Altus import gives each builder/lot-width/sales-phase its own
-- inventory # and therefore its own row. For a public marketplace, several of
-- these are effectively one card — same project_name + city + builder +
-- address + project_type, differing only by internal lot-width / inventory
-- metadata. (A master-planned community with MULTIPLE builders, e.g. "Mayfield
-- Village", legitimately keeps one row PER builder/type — those are not
-- collapsed because builder/type are part of the key.)
--
-- Strategy: keep ONE canonical row per group and set the rest to
-- record_status='archived' rather than deleting them, so the rows and their
-- Altus inventory #s stay in the table for reference and the change is fully
-- reversible. The losers' import_notes are annotated with the keeper id.
--
-- Safety:
--   * Published / approved / pending_review rows are NEVER archived (only
--     rows currently in 'draft' are touched).
--   * The canonical keeper is chosen by status (published first), then a real
--     hero image, then description completeness, then geocoding, then age.
--   * No public_project_pages or public/broker views are affected, because the
--     live (published) set contains no rows removable by this key.

with ranked as (
  select
    id,
    record_status,
    row_number() over w as rn,
    first_value(id) over w as keeper_id
  from projects
  window w as (
    partition by
      lower(trim(project_name)),
      lower(trim(coalesce(city, ''))),
      lower(trim(coalesce(builder_name, ''))),
      lower(trim(coalesce(address_full, ''))),
      coalesce(project_type, '')
    order by
      case record_status
        when 'published' then 0
        when 'approved' then 1
        when 'pending_review' then 2
        when 'draft' then 3
        else 4
      end,
      (coalesce(hero_image_url, '') <> '') desc,
      length(coalesce(description_long, '') || coalesce(description_short, '')) desc,
      (latitude is not null) desc,
      created_at asc,
      id asc
  )
)
update projects p
set
  record_status = 'archived',
  import_notes = coalesce(p.import_notes, '')
    || ' [LIQWD dedup 2026-06-24: archived as duplicate of project ' || r.keeper_id || '.]',
  updated_at = now()
from ranked r
where p.id = r.id
  and r.rn > 1
  and p.record_status = 'draft';
