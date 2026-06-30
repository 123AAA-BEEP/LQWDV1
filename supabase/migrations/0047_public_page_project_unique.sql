-- 0047_public_page_project_unique.sql
-- BUGFIX: savePublicPage() upserts public_project_pages with
-- `onConflict: 'project_id'`, but the table only had unique constraints on id
-- and slug. Postgres requires a unique/exclusion constraint matching the
-- ON CONFLICT target, so the upsert errored and the ENTIRE save was a silent
-- no-op — the assigned agent and the "indexable" flag never persisted. (The SEO
-- text only looked saved because the publish-time AI autofill writes it via a
-- separate UPDATE.)
--
-- One public page per project is the intended model (the editor reads it with
-- .eq('project_id', id).maybeSingle(), and publishProject assumes a single row),
-- so add the missing unique constraint. Verified: no project has duplicate rows.

alter table public.public_project_pages
  add constraint public_project_pages_project_unique unique (project_id);
