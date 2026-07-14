-- 0069: agent-supplied project depth for shared Shortlists (the buyer portal).
--
-- The catalog doesn't hold floor plans / incentives / deposit structures at
-- scale, but the AGENT working a project does — the builder emailed it to
-- them. So depth is agent-supplied, keyed to (agent, project) and reused
-- across every shortlist that agent shares containing that project:
--
--   agent_project_notes — one row per agent+project: current incentive,
--     deposit structure, free note. Text the agent types; never our data.
--   agent_project_files — the agent's uploads (floor-plan PDFs, brochures),
--     stored in the PRIVATE project-documents bucket (0003 policies already
--     let approved realtors write). Buyers see them only through short-lived
--     signed URLs minted by the shortlist page. rights_confirmed_at audits
--     the "I have the right to share this" confirmation at upload time.
--
-- Commission guarantee unchanged: these are agent-authored artifacts; the
-- shortlist render path still never touches project_private_commercials.

create table if not exists public.agent_project_notes (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  incentive_note text,
  deposit_note   text,
  extra_note     text,
  updated_at     timestamptz not null default now(),
  unique (profile_id, project_id),
  constraint agent_project_notes_incentive_len
    check (incentive_note is null or char_length(incentive_note) <= 500),
  constraint agent_project_notes_deposit_len
    check (deposit_note is null or char_length(deposit_note) <= 500),
  constraint agent_project_notes_extra_len
    check (extra_note is null or char_length(extra_note) <= 1000)
);
create index if not exists agent_project_notes_owner_idx
  on public.agent_project_notes (profile_id, project_id);

alter table public.agent_project_notes enable row level security;

drop policy if exists "agent_project_notes_owner_all" on public.agent_project_notes;
create policy "agent_project_notes_owner_all" on public.agent_project_notes
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant all on public.agent_project_notes to authenticated;
grant all on public.agent_project_notes to service_role;

create table if not exists public.agent_project_files (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles (id) on delete cascade,
  project_id          uuid not null references public.projects (id) on delete cascade,
  label               text not null,
  file_path           text not null,
  rights_confirmed_at timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint agent_project_files_label_len
    check (char_length(label) between 1 and 80),
  constraint agent_project_files_path_len
    check (char_length(file_path) between 1 and 300)
);
create index if not exists agent_project_files_owner_idx
  on public.agent_project_files (profile_id, project_id, created_at);

alter table public.agent_project_files enable row level security;

drop policy if exists "agent_project_files_owner_all" on public.agent_project_files;
create policy "agent_project_files_owner_all" on public.agent_project_files
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant all on public.agent_project_files to authenticated;
grant all on public.agent_project_files to service_role;
