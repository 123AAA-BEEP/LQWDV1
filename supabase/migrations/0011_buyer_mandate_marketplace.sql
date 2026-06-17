-- =============================================================================
-- 0011_buyer_mandate_marketplace.sql — Buyer Mandate Stage 2a (developer browse).
--
-- Adds a PRIVACY-SAFE developer view of active mandates and an entitlement seam
-- for the (pricing-undecided) developer access model. Read-only: this slice
-- lets developers browse criteria + the Verified badge + the submitting broker.
-- It deliberately EXCLUDES buyer PII, exact pre-approval amounts/lender, and any
-- broker contact details — contact exchange is the paywalled "connect" action
-- shipped in Stage 2b.
--
-- Idempotent. Run after 0010.
-- =============================================================================

-- 1. Entitlement seam (pricing-agnostic) --------------------------------------
-- Browse is free for developers; this flag is the seam the eventual paywall
-- (subscription and/or à la carte) will hang off. Admin/server-set only.
alter table public.profiles
  add column if not exists developer_mandate_access boolean not null default false;

-- Protect the new flag in the self-escalation guard (developers can't grant
-- themselves access).
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.realtor_tier is distinct from old.realtor_tier
     or new.plan is distinct from old.plan
     or new.developer_mandate_access is distinct from old.developer_mandate_access then
    raise exception 'Only admins or billing can change protected profile fields';
  end if;
  return new;
end;
$$;

-- 2. Privacy-safe developer view ----------------------------------------------
-- Definer view: self-gates to developers/admins via the WHERE clause and the
-- base table's RLS stays broker/admin-only. Exposes criteria + a computed
-- Verified badge + the submitting broker's name/brokerage (identity, NOT
-- contact). Never exposes buyer_label, exact pre-approval amount, lender, or
-- the raw verification booleans.
create or replace view public.buyer_mandates_developer_view as
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
