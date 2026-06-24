-- =============================================================================
-- LIQWD — Migration 0027: Broker Portal Suggestions
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Lets an approved realtor SUGGEST a broker portal link for a project, which
--   an admin then approves before it goes live. Builds on the existing
--   project_broker_portals.added_by_user_id / approved_by_user_id columns.
--
--   1) Adds project_broker_portals.status ('pending' | 'approved' | 'rejected').
--      Existing rows default to 'approved' (admin-created and already active).
--   2) Adds an RLS policy letting an APPROVED realtor INSERT a *pending*,
--      *inactive*, self-attributed suggestion only. Admin write (add / approve /
--      edit / delete) and admin/approved read stay exactly as before. Pending
--      rows are inactive, so they never surface in the broker directory or on a
--      project until an admin approves them.
--
-- SAFE TO RE-RUN?
--   Yes. ADD COLUMN IF NOT EXISTS, guarded constraint add, CREATE INDEX IF NOT
--   EXISTS, and guarded policy (re)creation.
--
-- NOTE
--   This was first applied directly to the live project (LIQWD DB V1) via the
--   Supabase migration tooling; this file records it in the repo history.
-- =============================================================================

-- 1. status column
alter table public.project_broker_portals
  add column if not exists status text not null default 'approved';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'project_broker_portals_status_chk'
  ) then
    alter table public.project_broker_portals
      add constraint project_broker_portals_status_chk
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end$$;

create index if not exists idx_broker_portals_status
  on public.project_broker_portals (status);

-- 2. RLS: approved realtors may suggest (pending, inactive, self-attributed).
drop policy if exists portals_realtor_suggest on public.project_broker_portals;
create policy portals_realtor_suggest on public.project_broker_portals
  for insert to authenticated
  with check (
    public.is_approved()
    and added_by_user_id = auth.uid()
    and status = 'pending'
    and is_active = false
    and approved_by_user_id is null
  );

-- =============================================================================
-- End of migration 0027.
-- =============================================================================
