-- =============================================================================
-- LIQWD — Migration 0088: crm_newsletter_sends (curated blast history)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   History + rate-limit record for the agent newsletter blast: an agent
--   curates 1–7 published Insights articles and sends a co-branded email to
--   their CONSENTED CRM contacts (consent_email = true, not unsubscribed,
--   not on the global email_suppressions list). One send per agent per 24h;
--   each recipient gets the standard HMAC unsubscribe link (global
--   suppression). Owner-scoped RLS.
--
-- EXECUTION ORDER
--   Run after 0087_crm_spine.sql.
-- =============================================================================

create table if not exists public.crm_newsletter_sends (
  id                    uuid primary key default gen_random_uuid(),
  agent_profile_id      uuid not null references public.profiles (id) on delete cascade,
  created_at            timestamptz not null default now(),
  subject               text not null,
  intro                 text,
  article_ids           uuid[] not null default '{}',
  recipient_count       integer not null default 0,
  skipped_count         integer not null default 0
);
create index if not exists idx_newsletter_sends_agent
  on public.crm_newsletter_sends (agent_profile_id, created_at desc);

alter table public.crm_newsletter_sends enable row level security;

drop policy if exists newsletter_sends_own on public.crm_newsletter_sends;
create policy newsletter_sends_own on public.crm_newsletter_sends
  for all to authenticated
  using (agent_profile_id = (select auth.uid()) or public.is_admin())
  with check (agent_profile_id = (select auth.uid()) or public.is_admin());

grant select, insert on public.crm_newsletter_sends to authenticated;
