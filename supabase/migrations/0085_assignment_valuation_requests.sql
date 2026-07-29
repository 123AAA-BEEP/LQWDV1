-- =============================================================================
-- LIQWD — Migration 0085: assignment_valuation_requests
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Consumer-side assignment lead capture (/assignment-value): people who
--   bought pre-construction and want to know what their assignment is worth
--   (or need out before closing). Different animal from the resale
--   home-value funnel — captures original purchase price/year, occupancy
--   stage, and whether the APS permits assignment. The promise is a free
--   assessment from an agent who works assignments; qualified leads feed the
--   gated Assignment Desk via an agent (the gated-never-public rule applies
--   to LISTINGS, not this lead form).
--
--   matched_project_id is a soft link to `projects` when the typed project
--   name matches our tracked inventory (no FK — provenance-free convenience,
--   never blocks capture). Inserts come exclusively from the service role;
--   reads/updates admin-only.
--
-- EXECUTION ORDER
--   Run after 0084_match_requests.sql.
-- =============================================================================

create table if not exists public.assignment_valuation_requests (
  id                            uuid primary key default gen_random_uuid(),
  created_at                    timestamptz not null default now(),
  status                        text not null default 'new',
  project_name                  text not null,
  city                          text,
  matched_project_id            uuid,
  purchase_price                numeric,
  purchase_year                 text,
  unit_type                     text,
  beds                          text,
  stage                         text,
  aps_assignment_clause         text,
  details                       text,
  owner_name                    text not null,
  owner_email                   text not null,
  owner_phone                   text,
  assigned_realtor_profile_id   uuid references public.profiles (id) on delete set null,
  source                        text,
  constraint avr_status_chk
    check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  constraint avr_unit_type_chk
    check (unit_type is null or unit_type in ('condo', 'townhouse', 'detached', 'other')),
  constraint avr_stage_chk
    check (stage is null or stage in ('pre-occupancy', 'interim-occupancy', 'closing-soon', 'not-sure')),
  constraint avr_aps_chk
    check (aps_assignment_clause is null or aps_assignment_clause in ('yes', 'no', 'not-sure'))
);

create index if not exists idx_avr_status
  on public.assignment_valuation_requests (status, created_at desc);

alter table public.assignment_valuation_requests enable row level security;

drop policy if exists avr_admin_all on public.assignment_valuation_requests;
create policy avr_admin_all on public.assignment_valuation_requests
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, update on public.assignment_valuation_requests to authenticated;
