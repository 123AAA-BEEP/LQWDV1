-- =============================================================================
-- LIQWD — Migration 0102: presence_audits
-- "See what Google thinks of you" — the free audit that opens the agent
-- acquisition funnel (campaign plan 2026-09, §5). One row per request; the
-- report is stored when the automated check ran, null when it is queued for
-- a hand-made report. Inserts go through the service role (public form);
-- admins read everything.
-- Applied live 2026-09-02 via MCP.
-- =============================================================================

create table if not exists public.presence_audits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brokerage text,
  city text,
  email text not null,
  marketing_consent boolean not null default false,
  consent_captured_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested', 'reported', 'failed', 'sent')),
  place_id text,
  report jsonb,
  source jsonb,
  profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists presence_audits_email_idx
  on public.presence_audits (lower(email), created_at desc);
create index if not exists presence_audits_created_idx
  on public.presence_audits (created_at desc);

alter table public.presence_audits enable row level security;
create policy presence_audits_admin_all on public.presence_audits
  for all using (public.is_admin()) with check (public.is_admin());
grant all on public.presence_audits to service_role;
