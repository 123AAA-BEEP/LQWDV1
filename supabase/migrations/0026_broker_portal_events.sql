-- =============================================================================
-- LIQWD — Migration 0026: broker_portal_events (click/impression tracking)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Logs broker-portal clicks (and, later, impressions) so featured placement
--   becomes a measurable ad product. A signed-in user logs their own events;
--   analytics are readable by admins and the granted developer for the project.
--
-- EXECUTION ORDER
--   Runs after 0025. Already applied to the live DB as `broker_portal_events`.
--
-- SAFE TO RE-RUN?  Yes (create ... if not exists; guarded policies).
-- =============================================================================

create table if not exists public.broker_portal_events (
  id               uuid primary key default gen_random_uuid(),
  portal_id        uuid references public.project_broker_portals (id) on delete cascade,
  project_id       uuid references public.projects (id) on delete set null,
  actor_profile_id uuid references public.profiles (id) on delete set null,
  event_type       text not null default 'click',
  was_featured     boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint broker_portal_events_type_chk
    check (event_type in ('click', 'impression'))
);
create index if not exists idx_bpe_portal  on public.broker_portal_events (portal_id);
create index if not exists idx_bpe_project on public.broker_portal_events (project_id);
create index if not exists idx_bpe_created on public.broker_portal_events (created_at);

alter table public.broker_portal_events enable row level security;
revoke all on public.broker_portal_events from anon;
grant select, insert on public.broker_portal_events to authenticated;
grant all on public.broker_portal_events to service_role;

drop policy if exists bpe_insert on public.broker_portal_events;
create policy bpe_insert on public.broker_portal_events
  for insert to authenticated
  with check (actor_profile_id = auth.uid());

drop policy if exists bpe_select on public.broker_portal_events;
create policy bpe_select on public.broker_portal_events
  for select to authenticated
  using (
    public.is_admin()
    or public.has_project_access(project_id, 'developer_restricted')
  );

-- =============================================================================
-- End of migration 0026.
-- =============================================================================
