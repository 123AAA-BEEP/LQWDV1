-- =============================================================================
-- LIQWD — Migration 0022: RLS for rental referral terms + suggestions
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Enables RLS and sets policies for the tables added in 0021:
--     - project_rental_referral_terms: approved realtors read; admin + the
--       granted developer write their own project's terms.
--     - platform_suggestions: submitter + admin (mirrors property_update_requests).
--   Grants include service_role (matches this project's grant convention).
--
-- EXECUTION ORDER
--   Runs after 0021_rental_referrals_and_suggestions.sql (this is 0022).
--   Already applied to the live DB as `pbr_rental_referrals_and_suggestions_rls`.
--
-- PREREQUISITES
--   0002 helpers (is_admin, is_approved, has_project_access) and the 0021 tables.
--
-- SAFE TO RE-RUN?
--   Yes. RLS enable is idempotent; policies are dropped (IF EXISTS) then created.
-- =============================================================================

-- 1. Enable RLS --------------------------------------------------------------
alter table public.project_rental_referral_terms enable row level security;
alter table public.platform_suggestions          enable row level security;

-- 2. Base privileges ---------------------------------------------------------
revoke all on public.project_rental_referral_terms from anon;
revoke all on public.platform_suggestions          from anon;
grant select, insert, update, delete on public.project_rental_referral_terms to authenticated;
grant select, insert, update, delete on public.platform_suggestions          to authenticated;
grant all on public.project_rental_referral_terms to service_role;
grant all on public.platform_suggestions          to service_role;
grant select on public.referral_opportunities_view to authenticated, service_role;

-- 3. project_rental_referral_terms policies ----------------------------------
drop policy if exists rental_referral_terms_select on public.project_rental_referral_terms;
create policy rental_referral_terms_select on public.project_rental_referral_terms
  for select to authenticated
  using (public.is_admin() or public.is_approved());

drop policy if exists rental_referral_terms_admin_write on public.project_rental_referral_terms;
create policy rental_referral_terms_admin_write on public.project_rental_referral_terms
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists rental_referral_terms_dev_insert on public.project_rental_referral_terms;
create policy rental_referral_terms_dev_insert on public.project_rental_referral_terms
  for insert to authenticated
  with check (public.has_project_access(project_id, 'developer_restricted'));

drop policy if exists rental_referral_terms_dev_update on public.project_rental_referral_terms;
create policy rental_referral_terms_dev_update on public.project_rental_referral_terms
  for update to authenticated
  using (public.has_project_access(project_id, 'developer_restricted'))
  with check (public.has_project_access(project_id, 'developer_restricted'));

-- 4. platform_suggestions policies -------------------------------------------
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
