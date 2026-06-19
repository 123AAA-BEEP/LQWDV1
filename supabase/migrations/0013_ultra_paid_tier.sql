-- =============================================================================
-- 0013_ultra_paid_tier.sql — make Ultra a paid subscription tier.
--
-- The realtor `plan` ladder becomes free → pro ($9.99) → ultra ($19.99). Ultra
-- includes Pro's tooling AND unlocks Deal Desk. The Stripe webhook sets
-- plan = 'ultra'; the admin Realtors tab can still comp Deal Desk via
-- realtor_tier = 'ultra' (isUltra() accepts either).
--
-- Idempotent. Run after 0012.
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_plan_chk;
alter table public.profiles
  add constraint profiles_plan_chk check (plan in ('free', 'pro', 'ultra'));
