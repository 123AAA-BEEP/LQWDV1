-- =============================================================================
-- LIQWD — Migration 0023: rental_referrals (refer-a-buyer flow)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds rental_referrals: an approved realtor refers a client to a
--   purpose-built-rental project's leasing team (the "Quick Wins" earn loop).
--   Status pipeline mirrors the agreed vocabulary; the building's team (or LIQWD
--   in full-service) drives status so the agent sees live progress.
--
-- EXECUTION ORDER
--   Runs after 0022. Already applied to the live DB as `rental_referrals`.
--
-- PREREQUISITES
--   0002 helpers (is_admin, is_approved, has_project_access), 0021 referral terms.
--
-- SAFE TO RE-RUN?  Yes (create ... if not exists, guarded trigger/policies).
-- =============================================================================

create table if not exists public.rental_referrals (
  id                      uuid primary key default gen_random_uuid(),
  project_id              uuid not null references public.projects (id) on delete cascade,
  referred_by_profile_id  uuid not null references public.profiles (id) on delete set null,
  submitting_brokerage_id uuid references public.brokerages (id) on delete set null,
  mandate_id              uuid references public.buyer_mandates (id) on delete set null,
  client_first_name       text,
  client_last_name        text,
  client_email            text,
  client_phone            text,
  message                 text,
  status                  text not null default 'new',
  developer_response_notes text,
  reviewed_by_profile_id  uuid references public.profiles (id) on delete set null,
  reviewed_at             timestamptz,
  payout_status           text not null default 'none',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint rental_referrals_status_chk check (status in
    ('new','received','in_progress','client_not_submitting','client_ineligible',
     'accepted','declined','withdrawn')),
  constraint rental_referrals_payout_chk check (payout_status in
    ('none','eligible','invoiced','paid','void'))
);
create index if not exists idx_rental_referrals_project on public.rental_referrals (project_id);
create index if not exists idx_rental_referrals_agent   on public.rental_referrals (referred_by_profile_id);
create index if not exists idx_rental_referrals_status  on public.rental_referrals (status);

drop trigger if exists trg_set_updated_at on public.rental_referrals;
create trigger trg_set_updated_at before update on public.rental_referrals
  for each row execute function public.set_updated_at();

alter table public.rental_referrals enable row level security;
revoke all on public.rental_referrals from anon;
grant select, insert, update, delete on public.rental_referrals to authenticated;
grant all on public.rental_referrals to service_role;

drop policy if exists rental_referrals_select on public.rental_referrals;
create policy rental_referrals_select on public.rental_referrals
  for select to authenticated
  using (
    referred_by_profile_id = auth.uid()
    or public.is_admin()
    or public.has_project_access(project_id, 'developer_restricted')
  );

drop policy if exists rental_referrals_insert on public.rental_referrals;
create policy rental_referrals_insert on public.rental_referrals
  for insert to authenticated
  with check (
    referred_by_profile_id = auth.uid()
    and (public.is_approved() or public.is_admin())
  );

-- Update: admin always; the granted developer when the project runs self-serve;
-- the referring agent (e.g. to withdraw). Transitions enforced in the action.
drop policy if exists rental_referrals_update on public.rental_referrals;
create policy rental_referrals_update on public.rental_referrals
  for update to authenticated
  using (
    public.is_admin()
    or referred_by_profile_id = auth.uid()
    or (
      public.has_project_access(project_id, 'developer_restricted')
      and exists (
        select 1 from public.project_rental_referral_terms t
        where t.project_id = rental_referrals.project_id
          and t.service_mode = 'self_serve'
      )
    )
  )
  with check (
    public.is_admin()
    or referred_by_profile_id = auth.uid()
    or (
      public.has_project_access(project_id, 'developer_restricted')
      and exists (
        select 1 from public.project_rental_referral_terms t
        where t.project_id = rental_referrals.project_id
          and t.service_mode = 'self_serve'
      )
    )
  );

drop policy if exists rental_referrals_delete on public.rental_referrals;
create policy rental_referrals_delete on public.rental_referrals
  for delete to authenticated using (public.is_admin());

-- =============================================================================
-- End of migration 0023.
-- =============================================================================
