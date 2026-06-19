-- =============================================================================
-- LIQWD — Migration 0020: Reward entitlement honours Pro time
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   1) Extends is_pro() so reward-granted Pro time (profiles.pro_until, added in
--      0019) unlocks the same Pro tooling as a paid subscription. A realtor is
--      "Pro" when EITHER plan = 'pro' OR pro_until > now(). Stripe remains the
--      sole owner of profiles.plan — this only READS both signals, and reward
--      time expires automatically. (Ultra stays separate, gated by is_ultra().)
--
--   2) Adds pro_until to the self-escalation guard. Because is_pro() now reads
--      pro_until, an unprotected pro_until would let a realtor self-grant Pro by
--      editing their own profile row (RLS permits owner updates). The guard
--      blocks non-admin / non-service-role changes to it, exactly as it already
--      does for role / verification_status / realtor_tier / plan. Reward grants
--      run via the service-role key (auth.uid() is null), so they pass.
--
-- EXECUTION ORDER
--   Run after 0019_referrals_rewards.sql (needs the pro_until column).
--
-- SAFE TO RE-RUN?  Yes — CREATE OR REPLACE on both functions.
-- =============================================================================

-- 1. is_pro() honours reward time ---------------------------------------------
create or replace function public.is_pro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (
        plan = 'pro'
        or (pro_until is not null and pro_until > now())
      )
  );
$$;

-- 2. Self-escalation guard also protects pro_until ----------------------------
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null under the service_role / server context → trusted
  -- (admin actions, the Stripe webhook, and the rewards engine all run here).
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.realtor_tier is distinct from old.realtor_tier
     or new.plan is distinct from old.plan
     or new.pro_until is distinct from old.pro_until then
    raise exception
      'Only admins or trusted server may change role, verification_status, realtor_tier, plan, or pro_until';
  end if;
  return new;
end;
$$;

-- =============================================================================
-- End of migration 0020.
-- =============================================================================
