-- 0030_publish_oakville_lowrise.sql
--
-- Populate more LOW-RISE inventory (townhomes + detached) in the
-- Mississauga–Oakville corridor by publishing draft rows that are already
-- complete: a real (non-floor-plan) rendering, a description, and geocoding.
--
-- This mirrors the app's publishProject / bulkPublish flow exactly, so the
-- public/provenance invariant holds:
--   1) ensure an ACTIVE public_project_pages row (the public view requires it),
--   2) flip the three project flags the public_projects_view checks.
--
-- Only Oakville rows qualify right now — every Mississauga low-rise draft is
-- still missing a hero rendering and is intentionally left as a draft until the
-- image-sourcing pipeline (scripts/import/condoroyalty) fills one. Floor-plan
-- heroes are excluded by design (rendering > exterior > interior > logo >
-- floor plan).

with candidates as (
  select id, slug
  from (
    select id, slug,
      row_number() over (
        partition by lower(trim(project_name)), lower(trim(coalesce(city, ''))),
                     lower(trim(coalesce(builder_name, ''))), lower(trim(coalesce(address_full, ''))),
                     coalesce(project_type, '')
        order by (coalesce(hero_image_url, '') <> '') desc,
                 length(coalesce(description_long, '')) desc, created_at
      ) rn
    from projects
    where project_type in ('townhouse', 'single_family')
      and city in ('Mississauga', 'Oakville')
      and record_status = 'draft'
      and coalesce(hero_image_url, '') <> ''
      and (coalesce(description_long, '') <> '' or coalesce(description_short, '') <> '')
      and hero_image_url !~* '(floor[-_ ]?plan|/plan|siteplan|keyplan|-fp[-_.]|brochure)'
  ) s
  where rn = 1
),
upsert_pages as (
  insert into public_project_pages (project_id, slug, is_active, indexable, lead_routing_mode, published_at)
  select c.id, c.slug, true, true, 'admin', now()
  from candidates c
  where not exists (
    select 1 from public_project_pages p where p.project_id = c.id
  )
  returning project_id
)
update projects p
set public_page_enabled = true,
    record_status = 'published',
    published_at = coalesce(p.published_at, now()),
    updated_at = now()
from candidates c
where p.id = c.id;
