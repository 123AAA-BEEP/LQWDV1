-- 0061: lead-triggered recruitment connector.
-- When a consumer lead lands on an UNCLAIMED project page, we invite the top
-- producers who farm that city (recruit_targets) with a real, specific hook:
-- "a buyer just inquired about <project> — the page is unclaimed."
--
--   * project_leads.recruit_notified_at — sweep watermark: the connector has
--     evaluated this lead (whether or not any invites went out).
--   * lead_recruit_sends — one row per invite actually sent. Powers the
--     per-project cooldown (don't re-blast the same project for every lead)
--     and gives attribution when an invited agent signs up.

alter table public.project_leads
  add column if not exists recruit_notified_at timestamptz;

create table if not exists public.lead_recruit_sends (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references public.project_leads (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  target_id  uuid not null references public.recruit_targets (id) on delete cascade,
  email      text not null,
  sent_at    timestamptz not null default now()
);

create index if not exists lead_recruit_sends_project_idx
  on public.lead_recruit_sends (project_id, sent_at desc);
create index if not exists lead_recruit_sends_target_idx
  on public.lead_recruit_sends (target_id);

alter table public.lead_recruit_sends enable row level security;

-- Admin-only PII (mirrors recruit_targets); the sweep runs with service role.
create policy "lead_recruit_sends_admin_select" on public.lead_recruit_sends
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant select on public.lead_recruit_sends to authenticated;
grant all on public.lead_recruit_sends to service_role;
