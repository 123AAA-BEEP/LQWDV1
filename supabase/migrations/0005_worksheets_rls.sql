-- =============================================================================
-- LIQWD — Migration 0005: RLS & Policies for Worksheets / Referrals / Suggestions
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Enables RLS on the tables added in 0004, sets base privileges (anon locked
--   out; authenticated broad, RLS narrows), and creates access policies:
--     - worksheets:            owner + admin only (client PII boundary)
--     - worksheet_submissions: agent owner, admin, and the granted developer
--       (their inbox); developer status edits gated to self-serve projects
--     - project_referral_terms: approved realtors read; admin + granted
--       developer write their own project's terms
--     - platform_suggestions:  submitter + admin (mirrors property_update_requests)
--   Design: docs/worksheets-and-referrals-design.md
--
-- EXECUTION ORDER
--   ... 0004_worksheets.sql, then 0005_worksheets_rls.sql  <-- this file
--
-- PREREQUISITES
--   0002 helper functions (is_admin, is_approved, has_project_access) and
--   0004 tables must exist.
--
-- SAFE TO RE-RUN?
--   Yes. RLS enable is idempotent; policies are dropped (IF EXISTS) then created.
--
-- NOTES
--   - The service_role key BYPASSES RLS (admin/server jobs unaffected).
--   - Developers never read the worksheets table; the client contact they need
--     for a referral travels in worksheet_submissions.snapshot (populated at
--     submit time per the "full contact on submission" decision).
-- =============================================================================

-- 1. Enable RLS on the new tables ---------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'worksheets', 'worksheet_submissions',
    'project_referral_terms', 'platform_suggestions'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- 2. Base privileges (anon gets nothing; authenticated broad, RLS narrows) -----
revoke all on public.worksheets             from anon;
revoke all on public.worksheet_submissions  from anon;
revoke all on public.project_referral_terms from anon;
revoke all on public.platform_suggestions   from anon;

grant select, insert, update, delete on public.worksheets             to authenticated;
grant select, insert, update, delete on public.worksheet_submissions  to authenticated;
grant select, insert, update, delete on public.project_referral_terms to authenticated;
grant select, insert, update, delete on public.platform_suggestions   to authenticated;
grant select on public.referral_opportunities_view to authenticated;

-- ============================ POLICIES =======================================

-- ---- worksheets (NON-PUBLIC: owner + admin only) ----------------------------
drop policy if exists worksheets_select on public.worksheets;
create policy worksheets_select on public.worksheets
  for select to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists worksheets_insert on public.worksheets;
create policy worksheets_insert on public.worksheets
  for insert to authenticated
  with check (
    owner_profile_id = auth.uid()
    and (public.is_approved() or public.is_admin())
  );

drop policy if exists worksheets_update on public.worksheets;
create policy worksheets_update on public.worksheets
  for update to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin())
  with check (owner_profile_id = auth.uid() or public.is_admin());

drop policy if exists worksheets_delete on public.worksheets;
create policy worksheets_delete on public.worksheets
  for delete to authenticated
  using (owner_profile_id = auth.uid() or public.is_admin());

-- ---- worksheet_submissions --------------------------------------------------
drop policy if exists ws_subs_select on public.worksheet_submissions;
create policy ws_subs_select on public.worksheet_submissions
  for select to authenticated
  using (
    submitted_by_profile_id = auth.uid()
    or public.is_admin()
    or public.has_project_access(project_id, 'developer_restricted')
  );

drop policy if exists ws_subs_insert on public.worksheet_submissions;
create policy ws_subs_insert on public.worksheet_submissions
  for insert to authenticated
  with check (
    submitted_by_profile_id = auth.uid()
    and (public.is_approved() or public.is_admin())
    and exists (
      select 1 from public.worksheets w
      where w.id = worksheet_id and w.owner_profile_id = auth.uid()
    )
  );

-- Update: admin always; the owning agent (allowed transitions — e.g. withdraw —
-- enforced in the server action); the granted developer when the project runs
-- in self-serve mode (drives status from their inbox).
drop policy if exists ws_subs_update on public.worksheet_submissions;
create policy ws_subs_update on public.worksheet_submissions
  for update to authenticated
  using (
    public.is_admin()
    or submitted_by_profile_id = auth.uid()
    or (
      public.has_project_access(project_id, 'developer_restricted')
      and exists (
        select 1 from public.project_referral_terms t
        where t.project_id = worksheet_submissions.project_id
          and t.service_mode = 'self_serve'
      )
    )
  )
  with check (
    public.is_admin()
    or submitted_by_profile_id = auth.uid()
    or (
      public.has_project_access(project_id, 'developer_restricted')
      and exists (
        select 1 from public.project_referral_terms t
        where t.project_id = worksheet_submissions.project_id
          and t.service_mode = 'self_serve'
      )
    )
  );

drop policy if exists ws_subs_delete on public.worksheet_submissions;
create policy ws_subs_delete on public.worksheet_submissions
  for delete to authenticated using (public.is_admin());

-- ---- project_referral_terms -------------------------------------------------
drop policy if exists referral_terms_select on public.project_referral_terms;
create policy referral_terms_select on public.project_referral_terms
  for select to authenticated
  using (public.is_admin() or public.is_approved());

-- Admin: full write (incl. delete + full-service management).
drop policy if exists referral_terms_admin_write on public.project_referral_terms;
create policy referral_terms_admin_write on public.project_referral_terms
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Granted developer: self-manage their own project's terms (insert + update).
drop policy if exists referral_terms_dev_insert on public.project_referral_terms;
create policy referral_terms_dev_insert on public.project_referral_terms
  for insert to authenticated
  with check (public.has_project_access(project_id, 'developer_restricted'));

drop policy if exists referral_terms_dev_update on public.project_referral_terms;
create policy referral_terms_dev_update on public.project_referral_terms
  for update to authenticated
  using (public.has_project_access(project_id, 'developer_restricted'))
  with check (public.has_project_access(project_id, 'developer_restricted'));

-- ---- platform_suggestions (submitter + admin) -------------------------------
drop policy if exists suggestions_select on public.platform_suggestions;
create policy suggestions_select on public.platform_suggestions
  for select to authenticated
  using (submitted_by_profile_id = auth.uid() or public.is_admin());

drop policy if exists suggestions_insert on public.platform_suggestions;
create policy suggestions_insert on public.platform_suggestions
  for insert to authenticated
  with check (submitted_by_profile_id = auth.uid());

drop policy if exists suggestions_update on public.platform_suggestions;
create policy suggestions_update on public.platform_suggestions
  for update to authenticated
  using (public.is_admin() or (submitted_by_profile_id = auth.uid() and status = 'new'))
  with check (public.is_admin() or submitted_by_profile_id = auth.uid());

drop policy if exists suggestions_delete on public.platform_suggestions;
create policy suggestions_delete on public.platform_suggestions
  for delete to authenticated using (public.is_admin());

-- =============================================================================
-- End of migration 0005.
-- =============================================================================
