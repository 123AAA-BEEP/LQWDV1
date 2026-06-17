-- =============================================================================
-- 0004_ultra_tier.sql — adds the membership tier (free / ultra) to profiles.
--
-- Idempotent. Free is the default for every existing and new profile, so this
-- migration is a no-op for behavior until a profile is explicitly upgraded.
--
-- Run order: after 0003_storage.sql. Safe to re-run.
-- =============================================================================

-- 1. Column + constraint + index ---------------------------------------------
alter table public.profiles
  add column if not exists tier text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_tier_chk'
  ) then
    alter table public.profiles
      add constraint profiles_tier_chk check (tier in ('free', 'ultra'));
  end if;
end $$;

create index if not exists idx_profiles_tier on public.profiles (tier);

-- 2. Extend the self-escalation guard to cover `tier` -------------------------
-- Only admins (or the trusted server / service_role context where auth.uid()
-- is null) may change role, verification_status, or tier. This prevents a
-- realtor from self-upgrading to Ultra by writing their own profile row.
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.tier is distinct from old.tier then
    raise exception 'Only admins can change role, verification_status, or tier';
  end if;
  return new;
end;
$$;

-- Trigger already exists from 0002; the CREATE OR REPLACE above is sufficient.
