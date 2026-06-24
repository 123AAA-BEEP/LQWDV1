-- 0032_republish_logo_map_heroes.sql
--
-- Follow-up to 0031. We unpublished all 74 floor-plan/logo/map/brochure hero
-- pages. To keep the marketplace populated WHILE real renderings are sourced,
-- re-publish the "least bad" subset — the 12 logo and 4 map heroes — which per
-- the LIQWD image ranking (rendering > exterior > interior > LOGO > floor plan)
-- are acceptable temporary placeholders: a brand wordmark or a location map is
-- recognizable/informative, where a floor-plan sheet or text brochure reads as
-- broken. The 51 floor plans and 2 text brochures stay DOWN.
--
-- Reversible / re-runnable. Keyed by hero URL so shared-image siblings come
-- back together. These rows still carry the 0031 audit tag in import_notes, so
-- they remain easy to find and replace with a rendering later.

create temp table _relist_slug(slug text) on commit drop;
insert into _relist_slug(slug) values
('yardley-towns'),('heartwood-village'),('fields-of-harmony'),('hawthorne-east-village-3'),
('uptown-meadowvale'),('tanglewood'),('1414-bayview'),('millcroft-towns'),('huntingdale-towns'),
('curio-condos'),('panorama'),('forest-hill-private-residences'),('unionville-station'),
('camilla-king'),('harmony-crossing'),('brooklin-towns');

create temp table _relist_url(u text) on commit drop;
insert into _relist_url(u)
  select distinct p.hero_image_url
  from projects p join _relist_slug r on p.slug = r.slug
  where coalesce(p.hero_image_url,'') <> '';

-- reactivate the public pages
update public_project_pages
set is_active = true, published_at = coalesce(published_at, now()), updated_at = now()
where project_id in (
  select id from projects
  where record_status = 'draft' and hero_image_url in (select u from _relist_url)
    and import_notes ilike '%hero audit 2026-06-24%'
);

-- re-publish the projects (only ones the audit took down)
update projects
set public_page_enabled = true,
    record_status = 'published',
    published_at = coalesce(published_at, now()),
    updated_at = now(),
    import_notes = import_notes
      || ' [0032: re-published with logo/map hero as interim placeholder pending a rendering.]'
where record_status = 'draft'
  and hero_image_url in (select u from _relist_url)
  and import_notes ilike '%hero audit 2026-06-24%';
