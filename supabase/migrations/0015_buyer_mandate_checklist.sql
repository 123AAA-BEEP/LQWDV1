-- =============================================================================
-- 0015_buyer_mandate_checklist.sql — buyer-readiness checklist (Stage 2C, lite).
--
-- Adds two self-attested readiness signals and exposes the full checklist
-- (not just the single computed `verified`) to the developer marketplace view,
-- so developers can see at a glance what an agent holds for the buyer:
--   buyer rep agreement · pre-approval · proof of funds · ID · deposit.
--
-- Self-attestation only for now; a later run backs items with parsed documents.
-- Idempotent. Run after 0014.
-- =============================================================================

alter table public.buyer_mandates
  add column if not exists id_verified boolean not null default false,
  add column if not exists deposit_ready boolean not null default false;

-- Recreate the developer view to surface the individual checklist signals.
-- (Dropped first: inserting columns mid-list isn't allowed by CREATE OR REPLACE.)
drop view if exists public.buyer_mandates_developer_view;
create view public.buyer_mandates_developer_view as
select
  m.id,
  m.status,
  m.location_areas,
  m.location_radius_km,
  m.price_min,
  m.price_max,
  m.financing_type,
  m.size_sqft_min,
  m.size_sqft_max,
  m.beds_min,
  m.baths_min,
  m.lot_notes,
  m.property_type,
  m.condition,
  m.timeline,
  m.must_haves,
  m.nice_to_haves,
  m.pre_approval_status,
  m.proof_of_funds,
  m.rep_agreement_signed,
  m.id_verified,
  m.deposit_ready,
  (
    m.pre_approval_status = 'pre_approved'
    and m.proof_of_funds
    and m.rep_agreement_signed
    and (m.pre_approval_expiry is null or m.pre_approval_expiry >= current_date)
  ) as verified,
  m.created_at,
  p.id            as broker_id,
  p.first_name    as broker_first_name,
  p.last_name     as broker_last_name,
  p.brokerage_name as broker_brokerage
from public.buyer_mandates m
join public.profiles p on p.id = m.submitted_by_user_id
where m.status = 'active'
  and (public.is_developer() or public.is_admin());
grant select on public.buyer_mandates_developer_view to authenticated;
