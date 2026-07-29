-- =============================================================================
-- LIQWD — Migration 0084: match_requests (agent-match wizard funnel)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Captures requests from the /match agent-matching wizard — our adaptation
--   of the realestateagents.com (ReferralExchange) funnel: one question per
--   screen (intent → price band → property type → location → timeline → name
--   → contact), micro-commitments before PII. Our twists: the matched public
--   agents are shown INSTANTLY (theirs hides the list behind email + SMS
--   verification because their agents pay per lead — ours don't), and the
--   consent line is CASL-clean, not a TCPA autodialer wall.
--
--   matched_agent_profile_ids records which public agents were shown at
--   submit time (audit + fairness). Auto-assignment is a later phase —
--   assigned_realtor_profile_id is in place. Inserts come exclusively from
--   the service role; reads/updates admin-only.
--
-- EXECUTION ORDER
--   Run after 0083_valuation_requests.sql.
-- =============================================================================

create table if not exists public.match_requests (
  id                            uuid primary key default gen_random_uuid(),
  created_at                    timestamptz not null default now(),
  status                        text not null default 'new',
  intent                        text not null,
  city                          text,
  address                       text,
  property_type                 text,
  price_band                    text,
  timeline                      text,
  name                          text not null,
  email                         text not null,
  phone                         text,
  matched_agent_profile_ids     uuid[] not null default '{}',
  assigned_realtor_profile_id   uuid references public.profiles (id) on delete set null,
  source                        text,
  constraint match_requests_status_chk
    check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  constraint match_requests_intent_chk
    check (intent in ('buying', 'selling', 'both'))
);

create index if not exists idx_match_requests_status
  on public.match_requests (status, created_at desc);

alter table public.match_requests enable row level security;

drop policy if exists match_requests_admin_all on public.match_requests;
create policy match_requests_admin_all on public.match_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update on public.match_requests to authenticated;
