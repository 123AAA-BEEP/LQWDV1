-- 0038_email_intake_log.sql
-- Audit + undo trail for the email-intake tool. A developer marketing email is
-- forwarded to a dedicated inbox, parsed by Claude, and turned into a created or
-- updated project. Every message lands here with what was extracted and what was
-- done, so an admin can review and one-click undo (unpublish/revert).
--
-- The webhook writes with the service-role client (bypasses RLS); RLS here just
-- keeps the log admin-only for any session-based read (the admin console).

create table if not exists public.email_intake_log (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),

  -- Source message
  from_email text,
  subject text,
  raw_text text,
  raw_html text,
  attachment_count integer not null default 0,

  -- Extraction
  extracted jsonb,                 -- the full emit_project tool output
  confidence numeric,              -- 0..1, model's self-rated confidence

  -- Outcome
  action text not null default 'pending' check (
    action in ('pending', 'created', 'updated', 'draft', 'skipped', 'error')
  ),
  project_id uuid references public.projects(id) on delete set null,
  published boolean not null default false,
  notes text,                      -- decision notes / error message

  created_at timestamptz not null default now()
);

comment on table public.email_intake_log is
  'Audit + undo trail for the email-to-project intake tool. Admin-only.';

create index if not exists email_intake_log_received_idx
  on public.email_intake_log (received_at desc);

alter table public.email_intake_log enable row level security;

drop policy if exists email_intake_admin_all on public.email_intake_log;
create policy email_intake_admin_all on public.email_intake_log
  for all using (public.is_admin()) with check (public.is_admin());
