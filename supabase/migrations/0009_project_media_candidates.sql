-- =============================================================================
-- LIQWD — Migration 0009: Project image-sourcing candidates
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Staging table for the image-sourcing pipeline. A worker (admin-triggered
--   batch or a Vercel cron) queries an image search API per project and writes
--   candidate image URLs here as 'pending'. An admin reviews thumbnails and
--   approves one; approval ingests the image into the public project-media
--   bucket and sets the project hero. Nothing goes live without review.
--
-- EXECUTION ORDER
--   Run AFTER 0008. Admin-only via RLS (service_role bypasses for the worker).
--
-- SAFE TO RE-RUN?  Yes (IF NOT EXISTS, drop-then-create policy).
-- =============================================================================

create table if not exists public.project_media_candidates (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  image_url           text not null,
  source_url          text,
  source_title        text,
  provider            text not null default 'google_cse',
  width               integer,
  height              integer,
  rank                integer not null default 0,
  status              text not null default 'pending',
  reviewed_by_user_id uuid references public.profiles (id) on delete set null,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now(),
  constraint project_media_candidates_status_chk
    check (status in ('pending', 'approved', 'rejected')),
  constraint project_media_candidates_unique unique (project_id, image_url)
);
create index if not exists idx_pmc_project on public.project_media_candidates (project_id);
create index if not exists idx_pmc_status  on public.project_media_candidates (status);

alter table public.project_media_candidates enable row level security;
grant select, insert, update, delete on public.project_media_candidates to authenticated;

drop policy if exists pmc_admin_all on public.project_media_candidates;
create policy pmc_admin_all on public.project_media_candidates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- End of migration 0009.
-- =============================================================================
