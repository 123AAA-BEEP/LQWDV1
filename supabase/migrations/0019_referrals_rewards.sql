-- =============================================================================
-- LIQWD — Migration 0019: Referrals & Rewards
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds the growth + data-quality reward system:
--     * profiles.referral_code        — each realtor's shareable invite code
--     * profiles.referred_by_profile_id — who invited them (set once, at signup)
--     * profiles.pro_until            — reward-granted Pro entitlement expiry.
--         0020 teaches is_pro() to honour this, so reward time unlocks the same
--         Pro tooling as a paid plan = 'pro' subscription (Stripe still owns
--         `plan`). Expiry is automatic once pro_until passes.
--     * public_project_pages.assigned_realtor_until — lead-stewardship expiry.
--         A contributor whose submission/update is approved becomes the lead
--         recipient for that project until this date, or until a newer approved
--         update bumps them.
--     * referrals          — one row per invited realtor (pending → qualified).
--     * rewards_ledger      — append-only record of every reward granted.
--       The (profile_id, reason, source_type, source_id) unique index makes
--       granting idempotent: the same submission/update/referral can never be
--       cashed in twice.
--
--   All reward writes happen server-side via the service-role key (which
--   bypasses RLS). RLS here only governs what a signed-in realtor can READ:
--   their own referrals and their own ledger entries; admins see everything.
--
-- EXECUTION ORDER
--   Run after 0018_restore_service_role_grants.sql. Then 0020.
--
-- SAFE TO RE-RUN?
--   Yes. Uses IF NOT EXISTS / CREATE OR REPLACE / guarded policy + trigger
--   (re)creation. Backfill only touches rows still missing a referral_code.
-- =============================================================================

-- 1. Referral-code generator --------------------------------------------------
--   Short, unambiguous, uppercase. Crockford-ish alphabet (no 0/O/1/I).
create or replace function public.gen_referral_code()
returns text language plpgsql volatile as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    -- Retry on the astronomically unlikely collision.
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- 2. New profile columns ------------------------------------------------------
alter table public.profiles
  add column if not exists referral_code        text,
  add column if not exists referred_by_profile_id uuid
    references public.profiles (id) on delete set null,
  add column if not exists pro_until            timestamptz;

-- Backfill codes for existing rows, then enforce presence + uniqueness.
update public.profiles
  set referral_code = public.gen_referral_code()
  where referral_code is null;

alter table public.profiles
  alter column referral_code set default public.gen_referral_code();

create unique index if not exists idx_profiles_referral_code
  on public.profiles (referral_code);
create index if not exists idx_profiles_referred_by
  on public.profiles (referred_by_profile_id);

-- 3. Lead-stewardship expiry on public pages ----------------------------------
alter table public.public_project_pages
  add column if not exists assigned_realtor_until timestamptz;
create index if not exists idx_public_pages_assigned_until
  on public.public_project_pages (assigned_realtor_until);

-- 4. referrals ----------------------------------------------------------------
create table if not exists public.referrals (
  id                   uuid primary key default gen_random_uuid(),
  referrer_profile_id  uuid not null references public.profiles (id) on delete cascade,
  referred_profile_id  uuid not null references public.profiles (id) on delete cascade,
  status               text not null default 'pending',
  qualified_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint referrals_status_chk check (status in ('pending', 'qualified', 'void')),
  constraint referrals_no_self  check (referrer_profile_id <> referred_profile_id),
  -- A realtor can only ever be referred once.
  constraint referrals_referred_unique unique (referred_profile_id)
);
create index if not exists idx_referrals_referrer on public.referrals (referrer_profile_id);
create index if not exists idx_referrals_status   on public.referrals (status);

-- 5. rewards_ledger -----------------------------------------------------------
create table if not exists public.rewards_ledger (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  reason       text not null,
  days_granted integer not null default 0,
  source_type  text,
  source_id    uuid,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  constraint rewards_ledger_reason_chk check (reason in (
    'referral_referrer',
    'referral_referred',
    'submission_approved',
    'update_approved',
    'manual'
  ))
);
create index if not exists idx_rewards_ledger_profile on public.rewards_ledger (profile_id);
-- Idempotency: one grant per (recipient, reason, source). source_id NULL rows
-- (e.g. 'manual') are exempt because NULLs are distinct in a unique index.
create unique index if not exists idx_rewards_ledger_dedupe
  on public.rewards_ledger (profile_id, reason, source_type, source_id);

-- 6. updated_at trigger for referrals -----------------------------------------
drop trigger if exists trg_set_updated_at on public.referrals;
create trigger trg_set_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

-- 7. RLS ----------------------------------------------------------------------
alter table public.referrals     enable row level security;
alter table public.rewards_ledger enable row level security;

grant select, insert, update, delete on public.referrals     to authenticated;
grant select, insert, update, delete on public.rewards_ledger to authenticated;

-- referrals: a realtor sees referrals they made or where they were referred.
drop policy if exists referrals_select on public.referrals;
create policy referrals_select on public.referrals
  for select to authenticated
  using (
    referrer_profile_id = auth.uid()
    or referred_profile_id = auth.uid()
    or public.is_admin()
  );
-- Inserts/updates are server-side only (service role bypasses RLS). Admins may
-- also manage rows directly.
drop policy if exists referrals_admin_write on public.referrals;
create policy referrals_admin_write on public.referrals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- rewards_ledger: a realtor sees only their own grants; admins see all.
drop policy if exists rewards_select on public.rewards_ledger;
create policy rewards_select on public.rewards_ledger
  for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());

drop policy if exists rewards_admin_write on public.rewards_ledger;
create policy rewards_admin_write on public.rewards_ledger
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- End of migration 0019.
-- =============================================================================
