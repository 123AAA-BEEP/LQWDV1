-- 0058: Project fact audit — the machine that sanity-checks live listings.
-- A runner (/api/project-audit) cross-references each published project
-- against the open web (right name, builder, city, actually new construction,
-- sane pricing) and vets unvetted gallery images. Findings land here; the
-- daily discovery digest surfaces them; high-confidence criticals unpublish.

-- Rotation cursor: oldest-audited first, nulls (never audited) first.
alter table public.projects
  add column if not exists last_audited_at timestamptz;

create index if not exists projects_audit_rotation_idx
  on public.projects (last_audited_at asc nulls first)
  where record_status = 'published';

-- Gallery vetting stamp — each media row is context-classified once.
alter table public.project_media
  add column if not exists vetted_at timestamptz;

create table if not exists public.project_audit_findings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  run_at timestamptz not null default now(),
  verdict text not null check (verdict in ('ok', 'issues', 'critical')),
  confidence numeric,
  issues jsonb not null default '[]'::jsonb,
  summary text,
  action_taken text,
  sources text[] not null default '{}'
);

create index if not exists project_audit_findings_project_idx
  on public.project_audit_findings (project_id, run_at desc);
create index if not exists project_audit_findings_run_idx
  on public.project_audit_findings (run_at desc);

alter table public.project_audit_findings enable row level security;

-- Admin-only read; writes go through the service role runner.
create policy "audit_findings_admin_read" on public.project_audit_findings
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select on public.project_audit_findings to authenticated;
grant all on public.project_audit_findings to service_role;
