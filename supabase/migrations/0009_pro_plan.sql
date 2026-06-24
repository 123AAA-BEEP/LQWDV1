-- =============================================================================
-- 0009_pro_plan.sql — paid self-serve "Pro" tier (premium tooling).
--
-- IMPORTANT: Pro is DISTINCT from the invitation-only Ultra tier
-- (profiles.realtor_tier). Pro unlocks premium tooling and is set ONLY by the
-- Stripe webhook on an active subscription. It must NOT grant Deal Desk access
-- — that remains gated by realtor_tier = 'ultra' (admin/invitation).
--
-- Idempotent. Run after 0008. Safe to re-run.
-- =============================================================================

alter table public.profiles
  add column if not exists plan                   text not null default 'free',
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_plan_chk') then
    alter table public.profiles
      add constraint profiles_plan_chk check (plan in ('free', 'pro'));
  end if;
end$$;

create index if not exists idx_profiles_plan on public.profiles (plan);
create unique index if not exists idx_profiles_stripe_customer
  on public.profiles (stripe_customer_id) where stripe_customer_id is not null;

-- Self-escalation guard: only admins, or the trusted server (service_role,
-- where auth.uid() is null — e.g. the Stripe webhook), may change role,
-- verification_status, realtor_tier, or plan. Without protecting `plan`, a
-- realtor could self-grant Pro for free via a normal profile update (RLS lets
-- them edit their own row). The service-role bypass lets billing flip `plan`.
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.realtor_tier is distinct from old.realtor_tier
     or new.plan is distinct from old.plan then
    raise exception 'Only admins or billing can change role, verification_status, realtor_tier, or plan';
  end if;
  return new;
end;
$$;
