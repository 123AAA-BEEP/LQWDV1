-- 0053_indexable_default_true.sql
-- BUGFIX: public_project_pages.indexable defaulted to FALSE, so every page
-- created by an auto-publish path (single publish, bulk publish, email-intake)
-- rendered a noindex robots tag and was excluded from the sitemap — silently
-- hiding 20 live pages (including hot-drop publishes) from Google and
-- undermining the entire first-mover SEO strategy. Publishing a page IS the
-- decision to index it; the checkbox remains as a deliberate opt-OUT only.

alter table public.public_project_pages
  alter column indexable set default true;

-- Un-hide every existing page. (All 20 false rows are auto-created pages that
-- were never deliberately opted out.)
update public.public_project_pages set indexable = true where indexable = false;
