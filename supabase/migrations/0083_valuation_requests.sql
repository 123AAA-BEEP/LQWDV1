-- =============================================================================
-- LIQWD — Migration 0083: valuation_requests (seller-lead home-value funnel)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Captures "what's my home worth" requests from the public /home-value
--   funnel (hub + programmatic per-city pages). Honest model: LIQWD does not
--   compute an automated valuation (no MLS/sold-comparables feed) — the form
--   requests a FREE professional market assessment (CMA) prepared by a local
--   licensed agent, which is what the incumbent funnels ultimately deliver
--   anyway. Inserts come exclusively from the service role (public form
--   action, honeypot-guarded); reads/updates are admin-only. Agent
--   distribution is a later phase — assigned_realtor_profile_id is in place.
--
-- EXECUTION ORDER
--   Run after 0082_editor_notes.sql.
-- =============================================================================

create table if not exists public.valuation_requests (
  id                            uuid primary key default gen_random_uuid(),
  created_at                    timestamptz not null default now(),
  status                        text not null default 'new',
  address                       text not null,
  city                          text,
  property_type                 text,
  beds                          text,
  baths                         text,
  timeline                      text,
  details                       text,
  owner_name                    text not null,
  owner_email                   text not null,
  owner_phone                   text,
  assigned_realtor_profile_id   uuid references public.profiles (id) on delete set null,
  source_city_slug              text,
  constraint valuation_requests_status_chk
    check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  constraint valuation_requests_type_chk
    check (property_type is null or property_type in ('detached', 'semi', 'townhouse', 'condo', 'other'))
);

create index if not exists idx_valuation_requests_status
  on public.valuation_requests (status, created_at desc);

alter table public.valuation_requests enable row level security;

-- Inserts come exclusively from the service role; reads/updates admin-only.
drop policy if exists valuation_requests_admin_all on public.valuation_requests;
create policy valuation_requests_admin_all on public.valuation_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update on public.valuation_requests to authenticated;
