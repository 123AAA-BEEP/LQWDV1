-- =============================================================================
-- LIQWD — Migration 0008: RFP per-field hiding (builder confidentiality)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Lets a builder (via the admin proxy) withhold specific fields of a Deal Desk
--   RFP from the ultra realtors who view it — e.g. the target price, so an
--   appraisal isn't anchored low before closing. Adds:
--     - deal_rfps.hidden_fields text[]  (which fields to mask)
--     - deal_rfps_realtor_view (DEFINER): the realtor-facing gateway that
--       reproduces RFP eligibility AND nulls out any hidden field.
--     - tightens deal_rfps base RLS so ultra realtors NO LONGER read the base
--       table directly — they must go through the masked view. This makes the
--       hiding a real guarantee, not just a UI omission. Mirrors how
--       broker_projects_view shields admin-only project provenance.
--
-- HIDEABLE FIELD KEYS (stored in hidden_fields):
--   'brief', 'target_units', 'target_price', 'deadline'
--   (title / type / side stay visible — they describe the opportunity.)
--
-- EXECUTION ORDER
--   Run AFTER 0007_deal_rfps.sql.
--
-- SAFE TO RE-RUN?
--   Yes. add column IF NOT EXISTS, CREATE OR REPLACE view, drop-then-create
--   policy, idempotent grants.
-- =============================================================================

-- 1. hidden_fields on deal_rfps ----------------------------------------------
alter table public.deal_rfps
  add column if not exists hidden_fields text[] not null default '{}';

-- 2. Realtor-facing masked view ----------------------------------------------
--   DEFINER view: bypasses base-table RLS but re-applies the exact RFP
--   eligibility rules for the calling user, then masks hidden fields.
create or replace view public.deal_rfps_realtor_view as
select
  r.id                 as id,
  r.title              as title,
  r.rfp_type           as rfp_type,
  r.deal_side          as deal_side,
  r.status             as status,
  r.visibility         as visibility,
  r.project_id         as project_id,
  r.hidden_fields      as hidden_fields,
  r.created_at         as created_at,
  r.updated_at         as updated_at,
  case when 'brief'        = any(r.hidden_fields) then null else r.brief        end as brief,
  case when 'target_units' = any(r.hidden_fields) then null else r.target_units end as target_units,
  case when 'target_price' = any(r.hidden_fields) then null else r.target_price end as target_price,
  case when 'deadline'     = any(r.hidden_fields) then null else r.deadline_at  end as deadline_at
from public.deal_rfps r
where r.status <> 'draft'
  and (
    public.is_admin()
    or r.created_by_user_id = auth.uid()
    or (
      public.is_ultra()
      and (r.visibility = 'all_ultra' or public.is_invited_to_rfp(r.id))
    )
  );

grant select on public.deal_rfps_realtor_view to authenticated;

-- 3. Tighten base deal_rfps SELECT: admin + creator only ----------------------
--   Ultra realtors lose direct base-table read; they go through the masked
--   view above. can_respond_to_rfp() / is_invited_to_rfp() are SECURITY DEFINER
--   and read the base table internally, so proposal eligibility is unaffected.
drop policy if exists rfps_select on public.deal_rfps;
create policy rfps_select on public.deal_rfps
  for select to authenticated
  using (public.is_admin() or created_by_user_id = auth.uid());

-- =============================================================================
-- End of migration 0008.
-- =============================================================================
