-- 0027_enrichment_staging.sql
-- Additive staging layer for the search-based enrichment pipeline.
-- The bot writes ONLY here (+ project_media_candidates); humans promote
-- approved values into the draft `projects` row via the admin UI.
-- Additive only: CREATE TABLE / nullable columns. No DROP / destructive ALTER.

-- A single enrichment invocation (one city/stage run).
create table if not exists public.enrichment_runs (
  id uuid primary key default gen_random_uuid(),
  target_city text,
  mode text,
  params jsonb not null default '{}'::jsonb,
  status text not null default 'running'
    check (status in ('running', 'finished', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb
);

-- One extracted field value, traced to its source. Multiple candidates per
-- field are expected (competing sources); a human approves one.
create table if not exists public.project_field_candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  run_id uuid references public.enrichment_runs(id) on delete set null,
  field_name text not null,
  candidate_value text,
  source_url text,
  source_domain text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  observed_freshness date,
  is_proposed boolean not null default false,        -- planning-application (proposed, not built)
  provenance jsonb not null default '{}'::jsonb,      -- {application_number, ward, application_status, source_title, ...}
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'superseded')),
  reviewed_by_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Idempotency: same fact from same source = one row (re-runs upsert, no dupes).
create unique index if not exists project_field_candidates_uniq
  on public.project_field_candidates
     (project_id, field_name, coalesce(source_url, ''), md5(coalesce(candidate_value, '')));
create index if not exists project_field_candidates_project_status_idx
  on public.project_field_candidates (project_id, status);

-- A merge *proposal* for human review. The bot never merges or deletes.
create table if not exists public.dedup_proposals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.enrichment_runs(id) on delete set null,
  target_city text,
  canonical_label text not null,
  normalized_label text,
  member_project_ids uuid[] not null,
  suggested_primary uuid references public.projects(id),
  rationale text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'applied')),
  created_at timestamptz not null default now()
);

-- Raw fetched source text — audit trail ("every fact traces to a source"),
-- reproducibility, and a fetch cache for cheap re-runs.
create table if not exists public.enrichment_source_snapshots (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.enrichment_runs(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  url text not null,
  domain text,
  http_status int,
  fetched_at timestamptz not null default now(),
  content_hash text,
  content_text text
);
create index if not exists enrichment_source_snapshots_project_idx
  on public.enrichment_source_snapshots (project_id);

-- RLS: admin-readable (for the future review UI); the pipeline writes via the
-- service role, which bypasses RLS. No anon/realtor access to staging data.
alter table public.enrichment_runs enable row level security;
alter table public.project_field_candidates enable row level security;
alter table public.dedup_proposals enable row level security;
alter table public.enrichment_source_snapshots enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'enrichment_runs' and policyname = 'enrichment_runs_admin_all') then
    create policy enrichment_runs_admin_all on public.enrichment_runs
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'project_field_candidates' and policyname = 'project_field_candidates_admin_all') then
    create policy project_field_candidates_admin_all on public.project_field_candidates
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'dedup_proposals' and policyname = 'dedup_proposals_admin_all') then
    create policy dedup_proposals_admin_all on public.dedup_proposals
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'enrichment_source_snapshots' and policyname = 'enrichment_source_snapshots_admin_all') then
    create policy enrichment_source_snapshots_admin_all on public.enrichment_source_snapshots
      for all using (public.is_admin()) with check (public.is_admin());
  end if;
end $$;

grant select, insert, update on
  public.enrichment_runs,
  public.project_field_candidates,
  public.dedup_proposals,
  public.enrichment_source_snapshots
to service_role;
