-- =============================================================================
-- LIQWD — Migration 0079: page_events (privacy-safe first-party analytics)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Server-side event recording for the growth engine: page views and lead
--   submits on public surfaces (project pages, articles, agent profiles),
--   written fire-and-forget by the SERVICE ROLE from server components and
--   actions. No client-side tracking script, no cookies, no raw IP/UA storage
--   — `session_hash` is a salted daily hash, unlinkable across days.
--
--   Complements (does not replace) link_visits, which stays the attribution
--   log for agent share links. Also adds `first_responded_at` to
--   project_leads — stamped by the realtor Leads workspace the first time a
--   lead leaves 'new', powering future speed-to-lead metrics.
--
-- EXECUTION ORDER
--   Run after 0078_articles.sql.
-- =============================================================================

create table if not exists public.page_events (
  id                      uuid primary key default gen_random_uuid(),
  occurred_at             timestamptz not null default now(),
  event_type              text not null,
  page_type               text not null,
  public_project_page_id  uuid references public.public_project_pages (id) on delete set null,
  article_id              uuid references public.articles (id) on delete set null,
  agent_profile_id        uuid references public.profiles (id) on delete set null,
  session_hash            text,
  referrer_host           text,
  utm_source              text,
  utm_medium              text,
  utm_campaign            text,
  constraint page_events_event_type_chk
    check (event_type in ('page_view', 'lead_submit')),
  constraint page_events_page_type_chk
    check (page_type in ('project', 'article', 'agent_profile'))
);

create index if not exists idx_page_events_occurred
  on public.page_events (page_type, occurred_at desc);
create index if not exists idx_page_events_project_page
  on public.page_events (public_project_page_id) where public_project_page_id is not null;

alter table public.page_events enable row level security;

-- Inserts come exclusively from the service role (bypasses RLS); reads are
-- admin-only. No anon/realtor surface at all in v1.
drop policy if exists page_events_admin_select on public.page_events;
create policy page_events_admin_select on public.page_events
  for select to authenticated using (public.is_admin());

grant select on public.page_events to authenticated;

-- Daily rollup for the admin analytics tab. security_invoker so the base
-- table's admin-only RLS applies to whoever queries the view.
create or replace view public.page_stats_daily
with (security_invoker = true) as
select
  page_type,
  public_project_page_id,
  article_id,
  agent_profile_id,
  date_trunc('day', occurred_at)::date as day,
  count(*) filter (where event_type = 'page_view')   as views,
  count(*) filter (where event_type = 'lead_submit') as leads
from public.page_events
group by 1, 2, 3, 4, 5;

grant select on public.page_stats_daily to authenticated;

-- Speed-to-lead: stamped once, the first time a lead leaves 'new'.
alter table public.project_leads
  add column if not exists first_responded_at timestamptz;
