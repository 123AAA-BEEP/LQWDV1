-- 0031_unpublish_floorplan_logo_heroes.sql
--
-- A visual audit of all 141 distinct published hero images (each downloaded and
-- looked at) found 69 that are NOT usable as a hero: 51 floor-plan sheets,
-- 12 logos/wordmarks, 4 location maps, 2 text brochures. The rehost pipeline
-- had grabbed whatever image it found; filename checks miss these because the
-- files are named hero.png/.jpg.
--
-- Per the LIQWD image rule (a floor plan is a LAST resort, never the single
-- hero), unpublish every published project whose hero is one of these — back to
-- draft, public page deactivated — until a real rendering is sourced. This is
-- reversible: the rows, slugs, and public_project_pages remain; re-publish via
-- the admin Projects tab (or bulkPublish) once a rendering replaces the hero.
--
-- Unpublishing is keyed by the HERO IMAGE URL, not the slug, because several
-- published projects share one rehosted image (e.g. the four Ivy Rouge rows),
-- so 69 flagged URLs map to 74 published projects.
--
-- Full per-project list + reasons: docs/hero-image-audit-2026-06-24.md

create temp table _flagged_slug(slug text) on commit drop;
insert into _flagged_slug(slug) values
('summer-valley'),('yardley-towns'),('heartwood-village'),('fields-of-harmony'),
('hawthorne-east-village-3'),('rosedale-village'),('lifestyles-of-south-east-oakville'),
('plaza-on-yonge'),('southcal'),('uptown-meadowvale'),('aurora-trails'),('garden-square'),
('townsquare'),('textbook-towns'),('whitehorn-woods-2'),('ivy-rouge'),('victory-green'),
('trafalgar-highlands'),('meadowvale-brooks'),('south-cornell'),('unity'),('bayview-heights'),
('auden-grand-towns'),('tanglewood'),('sixty-five-broadway'),('yt-on-fourth'),('sincerely-acorn'),
('woodend-place'),('manors-on-mayfield'),('1414-bayview'),('millcroft-towns'),('whitby-meadows'),
('huntingdale-towns'),('mila'),('curio-condos'),('panorama'),('birchley-park'),('taywood-estates'),
('springwater'),('upper-caledon-east'),('leaside-common'),('forest-hill-private-residences'),
('high-point'),('amber-woods'),('georgina-view'),('homeward-hills'),('classic-drive'),('oakbrook'),
('eagles-view'),('unionville-station'),('seaton'),('eleven-altamont'),('upper-mayfield-estates'),
('brooklin-trails'),('mapleside-meadows'),('camilla-king'),('queens-lane'),('seaton-winding-woods'),
('seaton-whitevale'),('parkside-heights'),('brooklin-vue'),('harmony-crossing'),('terrace-park-towns'),
('west-brooklin'),('westfield'),('rise-at-stride'),('osprey-mills'),('brooklin-towns'),('westshore');

create temp table _bad_url(u text) on commit drop;
insert into _bad_url(u)
  select distinct p.hero_image_url
  from projects p join _flagged_slug f on p.slug = f.slug
  where coalesce(p.hero_image_url,'') <> '';

-- 1) deactivate the public pages for affected published projects
update public_project_pages
set is_active = false, updated_at = now()
where project_id in (
  select id from projects
  where record_status = 'published' and hero_image_url in (select u from _bad_url)
);

-- 2) revert the projects to draft + annotate for the re-sourcing queue
update projects
set public_page_enabled = false,
    record_status = 'draft',
    updated_at = now(),
    import_notes = coalesce(import_notes,'')
      || ' [hero audit 2026-06-24: hero was a floor plan/logo/map — unpublished pending a real rendering.]'
where record_status = 'published'
  and hero_image_url in (select u from _bad_url);
