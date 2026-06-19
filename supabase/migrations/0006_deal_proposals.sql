-- =============================================================================
-- LIQWD — Migration 0004: Worksheet Proposals (Deal Desk, Phase 1)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds project_proposals: a realtor-initiated counter-offer against an
--   existing project (higher commission, price reduction, richer incentives)
--   in exchange for a stated consideration (campaign / buyer guarantee, volume,
--   timeline). Modelled exactly on property_update_requests: a submitter, a
--   project, a status lifecycle, admin review fields, and the shared updated_at
--   trigger. Concierge / admin-mediated for Phase 1 (see
--   docs/monetization-deal-desk.md).
--
-- EXECUTION ORDER
--   Run AFTER 0001_structural.sql and 0002_rls_policies.sql.
--
-- SAFE TO RE-RUN?
--   Yes. CREATE ... IF NOT EXISTS, guarded trigger (re)creation, and
--   drop-then-create policies.
-- =============================================================================

-- 1. Table --------------------------------------------------------------------
create table if not exists public.project_proposals (
  id                     uuid primary key default gen_random_uuid(),
  project_id             uuid not null references public.projects (id) on delete cascade,
  submitted_by_user_id   uuid not null references public.profiles (id),
  proposal_format        text not null default 'worksheet',
  -- structured asks (worksheet) ---------------------------------------------
  commission_ask_percent numeric(5,2),
  price_reduction_ask    numeric(12,2),
  incentive_ask          text,
  -- what the realtor puts up in exchange ------------------------------------
  consideration          text,
  -- freeform / extra context (sole field for proposal_format = 'freeform') --
  narrative              text,
  valid_until            date,
  status                 text not null default 'submitted',
  admin_notes            text,
  reviewed_by_user_id    uuid references public.profiles (id) on delete set null,
  reviewed_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint project_proposals_format_chk
    check (proposal_format in ('worksheet', 'freeform')),
  constraint project_proposals_status_chk
    check (status in ('submitted', 'under_review', 'countered',
                      'accepted', 'declined', 'withdrawn', 'expired'))
);
create index if not exists idx_project_proposals_project_id   on public.project_proposals (project_id);
create index if not exists idx_project_proposals_submitted_by on public.project_proposals (submitted_by_user_id);
create index if not exists idx_project_proposals_status       on public.project_proposals (status);

-- 2. updated_at trigger -------------------------------------------------------
drop trigger if exists trg_set_updated_at on public.project_proposals;
create trigger trg_set_updated_at
  before update on public.project_proposals
  for each row execute function public.set_updated_at();

-- 3. RLS ----------------------------------------------------------------------
alter table public.project_proposals enable row level security;

-- New tables don't inherit the schema-wide grant from 0002; grant explicitly.
grant select, insert, update, delete on public.project_proposals to authenticated;

-- Owner sees their own; admin sees all. (mirrors updates_select)
drop policy if exists proposals_select on public.project_proposals;
create policy proposals_select on public.project_proposals
  for select to authenticated
  using (submitted_by_user_id = auth.uid() or public.is_admin());

-- Only the approved realtor may file a proposal as themselves.
drop policy if exists proposals_insert on public.project_proposals;
create policy proposals_insert on public.project_proposals
  for insert to authenticated
  with check (submitted_by_user_id = auth.uid() and public.is_approved());

-- Admin can act on any; realtor may amend/withdraw only while still open.
drop policy if exists proposals_update on public.project_proposals;
create policy proposals_update on public.project_proposals
  for update to authenticated
  using (
    public.is_admin()
    or (submitted_by_user_id = auth.uid() and status in ('submitted', 'countered'))
  )
  with check (public.is_admin() or submitted_by_user_id = auth.uid());

drop policy if exists proposals_admin_delete on public.project_proposals;
create policy proposals_admin_delete on public.project_proposals
  for delete to authenticated using (public.is_admin());

-- =============================================================================
-- End of migration 0004.
-- =============================================================================
