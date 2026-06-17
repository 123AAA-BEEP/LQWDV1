-- =============================================================================
-- 0005_ultra_billing.sql — Stripe subscription linkage for the Ultra tier.
--
-- These columns are written only by the trusted server (Stripe webhook /
-- checkout action via the service-role client). The actual access gate is
-- profiles.tier, which is already protected from self-escalation by the guard
-- trigger (0004). Idempotent; safe to re-run.
--
-- Run order: after 0004_ultra_tier.sql.
-- =============================================================================

alter table public.profiles
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

create unique index if not exists idx_profiles_stripe_customer
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists idx_profiles_stripe_subscription
  on public.profiles (stripe_subscription_id);
