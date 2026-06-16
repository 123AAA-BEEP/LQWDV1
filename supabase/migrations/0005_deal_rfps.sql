-- =============================================================================
-- LIQWD — Migration 0005: RFP / Deal Desk (Phase 1)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Developer-initiated Requests for Proposal that invitation-only "ultra"
--   realtors respond to (new listing mandate, bulk purchase, inventory/trouble
--   unit, full development; buy or list side). Adds:
--     - profiles.realtor_tier  ('standard' | 'ultra'), admin-controlled
--     - deal_rfps, deal_rfp_invitations, deal_rfp_proposals
--     - is_ultra(), is_invited_to_rfp(), can_respond_to_rfp() helpers
--     - confidential RLS: an RFP is visible only to admin, its creator, and
--       eligible ultra realtors; a proposal only to its author + admin.
--   Concierge / admin-mediated for Phase 1 (admin is the developer's proxy).
--   See docs/monetization-deal-desk.md.
--
-- EXECUTION ORDER
--   Run AFTER 0001–0004.
--
-- SAFE TO RE-RUN?
--   Yes. add column IF NOT EXISTS, guarded constraint add, CREATE OR REPLACE
--   functions, drop-then-create policies, idempotent table/trigger creation.
-- =============================================================================

-- 1. Ultra tier on profiles (admin-controlled) --------------------------------
alter table public.profiles
  add column if not exists realtor_tier text not null default 'standard';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_realtor_tier_chk'
  ) then
    alter table public.profiles
      add constraint profiles_realtor_tier_chk
      check (realtor_tier in ('standard', 'ultra'));
  end if;
end$$;

create index if not exists idx_profiles_realtor_tier on public.profiles (realtor_tier);

-- Extend the self-escalation guard so non-admins can't grant themselves ultra.
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.realtor_tier is distinct from old.realtor_tier then
    raise exception 'Only admins can change role, verification_status or realtor_tier';
  end if;
  return new;
end;
$$;

-- 2. Tables -------------------------------------------------------------------
create table if not exists public.deal_rfps (
  id                 uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references public.profiles (id),
  project_id         uuid references public.projects (id) on delete set null,
  rfp_type           text not null,
  deal_side          text not null,
  title              text not null,
  brief              text,
  target_units       integer,
  target_price       numeric(14,2),
  deadline_at        timestamptz,
  visibility         text not null default 'invited',
  status             text not null default 'draft',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint deal_rfps_type_chk
    check (rfp_type in ('new_listing', 'bulk_purchase', 'inventory_unit',
                        'trouble_unit', 'full_development')),
  constraint deal_rfps_side_chk check (deal_side in ('buy', 'list')),
  constraint deal_rfps_visibility_chk check (visibility in ('invited', 'all_ultra')),
  constraint deal_rfps_status_chk
    check (status in ('draft', 'open', 'shortlisting', 'awarded', 'closed', 'cancelled'))
);
create index if not exists idx_deal_rfps_status     on public.deal_rfps (status);
create index if not exists idx_deal_rfps_created_by on public.deal_rfps (created_by_user_id);
create index if not exists idx_deal_rfps_project_id on public.deal_rfps (project_id);

create table if not exists public.deal_rfp_invitations (
  id                 uuid primary key default gen_random_uuid(),
  rfp_id             uuid not null references public.deal_rfps (id) on delete cascade,
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  invited_by_user_id uuid references public.profiles (id) on delete set null,
  status             text not null default 'invited',
  created_at         timestamptz not null default now(),
  constraint deal_rfp_invitations_unique unique (rfp_id, profile_id),
  constraint deal_rfp_invitations_status_chk
    check (status in ('invited', 'viewed', 'declined'))
);
create index if not exists idx_deal_rfp_invitations_rfp     on public.deal_rfp_invitations (rfp_id);
create index if not exists idx_deal_rfp_invitations_profile on public.deal_rfp_invitations (profile_id);

create table if not exists public.deal_rfp_proposals (
  id                   uuid primary key default gen_random_uuid(),
  rfp_id               uuid not null references public.deal_rfps (id) on delete cascade,
  submitted_by_user_id uuid not null references public.profiles (id),
  price_offer          numeric(14,2),
  units                integer,
  conditions           text,
  narrative            text,
  status               text not null default 'submitted',
  admin_notes          text,
  reviewed_by_user_id  uuid references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint deal_rfp_proposals_status_chk
    check (status in ('submitted', 'shortlisted', 'awarded', 'declined', 'withdrawn'))
);
create index if not exists idx_deal_rfp_proposals_rfp          on public.deal_rfp_proposals (rfp_id);
create index if not exists idx_deal_rfp_proposals_submitted_by on public.deal_rfp_proposals (submitted_by_user_id);
create index if not exists idx_deal_rfp_proposals_status       on public.deal_rfp_proposals (status);

-- 3. updated_at triggers ------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['deal_rfps', 'deal_rfp_proposals'] loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- 4. Helper functions (SECURITY DEFINER → no RLS recursion) -------------------
create or replace function public.is_ultra()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and verification_status = 'approved'
      and realtor_tier = 'ultra'
  );
$$;

create or replace function public.is_invited_to_rfp(p_rfp_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deal_rfp_invitations
    where rfp_id = p_rfp_id and profile_id = auth.uid()
  );
$$;

create or replace function public.can_respond_to_rfp(p_rfp_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deal_rfps r
    where r.id = p_rfp_id
      and r.status in ('open', 'shortlisting')
      and (
        r.visibility = 'all_ultra'
        or exists (
          select 1 from public.deal_rfp_invitations i
          where i.rfp_id = r.id and i.profile_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.is_ultra()                  to authenticated;
grant execute on function public.is_invited_to_rfp(uuid)     to authenticated;
grant execute on function public.can_respond_to_rfp(uuid)    to authenticated;

-- 5. RLS ----------------------------------------------------------------------
alter table public.deal_rfps            enable row level security;
alter table public.deal_rfp_invitations enable row level security;
alter table public.deal_rfp_proposals   enable row level security;

grant select, insert, update, delete on public.deal_rfps            to authenticated;
grant select, insert, update, delete on public.deal_rfp_invitations to authenticated;
grant select, insert, update, delete on public.deal_rfp_proposals   to authenticated;

-- ---- deal_rfps : admin + creator + eligible ultra realtors ------------------
drop policy if exists rfps_select on public.deal_rfps;
create policy rfps_select on public.deal_rfps
  for select to authenticated
  using (
    public.is_admin()
    or created_by_user_id = auth.uid()
    or (
      public.is_ultra()
      and status <> 'draft'
      and (visibility = 'all_ultra' or public.is_invited_to_rfp(id))
    )
  );

drop policy if exists rfps_admin_write on public.deal_rfps;
create policy rfps_admin_write on public.deal_rfps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- deal_rfp_invitations : admin + the invited realtor (own row) -----------
drop policy if exists rfp_invitations_select on public.deal_rfp_invitations;
create policy rfp_invitations_select on public.deal_rfp_invitations
  for select to authenticated
  using (public.is_admin() or profile_id = auth.uid());

drop policy if exists rfp_invitations_admin_write on public.deal_rfp_invitations;
create policy rfp_invitations_admin_write on public.deal_rfp_invitations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- deal_rfp_proposals : author + admin (confidential) ---------------------
drop policy if exists rfp_proposals_select on public.deal_rfp_proposals;
create policy rfp_proposals_select on public.deal_rfp_proposals
  for select to authenticated
  using (public.is_admin() or submitted_by_user_id = auth.uid());

drop policy if exists rfp_proposals_insert on public.deal_rfp_proposals;
create policy rfp_proposals_insert on public.deal_rfp_proposals
  for insert to authenticated
  with check (
    submitted_by_user_id = auth.uid()
    and public.is_ultra()
    and public.can_respond_to_rfp(rfp_id)
  );

drop policy if exists rfp_proposals_update on public.deal_rfp_proposals;
create policy rfp_proposals_update on public.deal_rfp_proposals
  for update to authenticated
  using (
    public.is_admin()
    or (submitted_by_user_id = auth.uid() and status = 'submitted')
  )
  with check (public.is_admin() or submitted_by_user_id = auth.uid());

drop policy if exists rfp_proposals_admin_delete on public.deal_rfp_proposals;
create policy rfp_proposals_admin_delete on public.deal_rfp_proposals
  for delete to authenticated using (public.is_admin());

-- =============================================================================
-- End of migration 0005.
-- =============================================================================
