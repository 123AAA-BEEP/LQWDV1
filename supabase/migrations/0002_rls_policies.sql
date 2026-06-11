-- =============================================================================
-- LIQWD — Migration 0002: RLS, Helper Functions & Policies
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   - Adds SECURITY DEFINER helper functions: is_admin(), is_approved(),
--     has_project_access(), safe_uuid().
--   - Adds a guard trigger so non-admins cannot change their own role or
--     verification_status (no self-escalation).
--   - Enables Row Level Security on every base table.
--   - Sets base privileges (anon locked down; authenticated broad, RLS narrows).
--   - Creates all access policies enforcing the public/private boundary:
--       * public reads only through approved public-facing views/layers
--       * raw private tables stay non-public
--       * approved-realtor gating for broker-only data
--       * grant-based + uploader-scoped developer document access
--       * admin-only access for review queues and audit logs
--
-- EXECUTION ORDER
--   1) 0001_structural.sql
--   2) 0002_rls_policies.sql    <-- this file (run SECOND)
--   3) 0003_storage.sql
--   4) seed.sql                 (optional)
--
-- PREREQUISITES
--   0001_structural.sql must have been run (tables + views must exist).
--
-- SAFE TO RE-RUN?
--   Yes. Functions use CREATE OR REPLACE; policies and the guard trigger are
--   dropped (IF EXISTS) before being recreated; RLS enable is idempotent.
--
-- NOTES
--   - The service_role key BYPASSES RLS, so admin/server-side jobs are
--     unaffected by these policies.
--   - First-admin bootstrap is intentionally NOT here. Run it once, separately,
--     after the admin's profile row exists (see project README / handoff).
-- =============================================================================

-- 1. Helper functions (SECURITY DEFINER → bypass RLS, no recursion) ------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and verification_status = 'approved');
$$;

create or replace function public.has_project_access(p_project_id uuid, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_access_grants g
    where g.project_id = p_project_id
      and g.user_id    = auth.uid()
      and g.access_role = p_role
      and g.is_active  = true
      and (g.expires_at is null or g.expires_at > now())
  );
$$;

-- Safe uuid cast (used by storage policies in 0003; returns null instead of
-- erroring on non-uuid input, so malformed paths fail closed).
create or replace function public.safe_uuid(p text)
returns uuid language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.is_admin()                     to anon, authenticated;
grant execute on function public.is_approved()                  to anon, authenticated;
grant execute on function public.has_project_access(uuid, text) to anon, authenticated;
grant execute on function public.safe_uuid(text)                to anon, authenticated;

-- 2. Guard: only admins (or trusted server) may change role/verification -------
create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null under the service_role / server context → trusted
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status then
    raise exception 'Only admins can change role or verification_status';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_sensitive_fields();

-- 3. Enable RLS on every base table -------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'brokerages', 'profiles', 'verification_requests', 'projects',
    'project_private_commercials', 'project_broker_portals', 'project_media',
    'project_floorplans', 'project_incentives', 'project_documents',
    'public_project_pages', 'project_leads', 'project_access_grants',
    'property_submissions', 'property_update_requests', 'audit_logs'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- 4. Base privileges ----------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Public-safe anon surfaces
grant select on public.brokerages           to anon;
grant select on public.project_media        to anon;   -- RLS limits to is_public
grant select on public.public_project_pages to anon;   -- RLS limits to is_active
grant insert on public.project_leads        to anon;   -- public lead capture
grant select on public.public_projects_view to anon, authenticated;
grant select on public.public_realtor_cards to anon, authenticated;

-- ============================ POLICIES =======================================

-- ---- profiles (NON-PUBLIC: owner + admin only) ------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ---- brokerages -------------------------------------------------------------
drop policy if exists brokerages_select on public.brokerages;
create policy brokerages_select on public.brokerages
  for select to anon, authenticated using (true);

drop policy if exists brokerages_admin_write on public.brokerages;
create policy brokerages_admin_write on public.brokerages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- verification_requests --------------------------------------------------
drop policy if exists verification_select on public.verification_requests;
create policy verification_select on public.verification_requests
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());

drop policy if exists verification_insert on public.verification_requests;
create policy verification_insert on public.verification_requests
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists verification_admin_update on public.verification_requests;
create policy verification_admin_update on public.verification_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists verification_admin_delete on public.verification_requests;
create policy verification_admin_delete on public.verification_requests
  for delete to authenticated using (public.is_admin());

-- ---- projects ---------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_private_commercials --------------------------------------------
drop policy if exists ppc_select on public.project_private_commercials;
create policy ppc_select on public.project_private_commercials
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists ppc_admin_write on public.project_private_commercials;
create policy ppc_admin_write on public.project_private_commercials
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_broker_portals -------------------------------------------------
drop policy if exists portals_select on public.project_broker_portals;
create policy portals_select on public.project_broker_portals
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists portals_admin_write on public.project_broker_portals;
create policy portals_admin_write on public.project_broker_portals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_media ----------------------------------------------------------
drop policy if exists media_public_select on public.project_media;
create policy media_public_select on public.project_media
  for select to anon, authenticated using (is_public = true);

drop policy if exists media_staff_select on public.project_media;
create policy media_staff_select on public.project_media
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists media_admin_write on public.project_media;
create policy media_admin_write on public.project_media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_floorplans -----------------------------------------------------
drop policy if exists floorplans_select on public.project_floorplans;
create policy floorplans_select on public.project_floorplans
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists floorplans_admin_write on public.project_floorplans;
create policy floorplans_admin_write on public.project_floorplans
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_incentives -----------------------------------------------------
drop policy if exists incentives_select on public.project_incentives;
create policy incentives_select on public.project_incentives
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists incentives_admin_write on public.project_incentives;
create policy incentives_admin_write on public.project_incentives
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_documents (realtor/admin all; developer = own uploads + grant) -
drop policy if exists documents_select on public.project_documents;
create policy documents_select on public.project_documents
  for select to authenticated
  using (
    public.is_admin()
    or public.is_approved()
    or (
      uploaded_by_user_id = auth.uid()
      and public.has_project_access(project_id, 'developer_restricted')
    )
  );

drop policy if exists documents_admin_write on public.project_documents;
create policy documents_admin_write on public.project_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- public_project_pages ---------------------------------------------------
drop policy if exists pages_public_select on public.public_project_pages;
create policy pages_public_select on public.public_project_pages
  for select to anon, authenticated using (is_active = true);

drop policy if exists pages_staff_select on public.public_project_pages;
create policy pages_staff_select on public.public_project_pages
  for select to authenticated using (public.is_admin() or public.is_approved());

drop policy if exists pages_admin_write on public.public_project_pages;
create policy pages_admin_write on public.public_project_pages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- project_leads ----------------------------------------------------------
drop policy if exists leads_insert on public.project_leads;
create policy leads_insert on public.project_leads
  for insert to anon, authenticated with check (true);

drop policy if exists leads_select on public.project_leads;
create policy leads_select on public.project_leads
  for select to authenticated
  using (public.is_admin() or assigned_realtor_profile_id = auth.uid());

drop policy if exists leads_update on public.project_leads;
create policy leads_update on public.project_leads
  for update to authenticated
  using (public.is_admin() or assigned_realtor_profile_id = auth.uid())
  with check (public.is_admin() or assigned_realtor_profile_id = auth.uid());

drop policy if exists leads_admin_delete on public.project_leads;
create policy leads_admin_delete on public.project_leads
  for delete to authenticated using (public.is_admin());

-- ---- project_access_grants --------------------------------------------------
drop policy if exists grants_select on public.project_access_grants;
create policy grants_select on public.project_access_grants
  for select to authenticated using (public.is_admin() or user_id = auth.uid());

drop policy if exists grants_admin_write on public.project_access_grants;
create policy grants_admin_write on public.project_access_grants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- property_submissions ---------------------------------------------------
drop policy if exists submissions_select on public.property_submissions;
create policy submissions_select on public.property_submissions
  for select to authenticated
  using (submitted_by_user_id = auth.uid() or public.is_admin());

drop policy if exists submissions_insert on public.property_submissions;
create policy submissions_insert on public.property_submissions
  for insert to authenticated with check (submitted_by_user_id = auth.uid());

drop policy if exists submissions_update on public.property_submissions;
create policy submissions_update on public.property_submissions
  for update to authenticated
  using (public.is_admin() or (submitted_by_user_id = auth.uid() and status in ('draft','needs_changes')))
  with check (public.is_admin() or submitted_by_user_id = auth.uid());

drop policy if exists submissions_admin_delete on public.property_submissions;
create policy submissions_admin_delete on public.property_submissions
  for delete to authenticated using (public.is_admin());

-- ---- property_update_requests -----------------------------------------------
drop policy if exists updates_select on public.property_update_requests;
create policy updates_select on public.property_update_requests
  for select to authenticated
  using (submitted_by_user_id = auth.uid() or public.is_admin());

drop policy if exists updates_insert on public.property_update_requests;
create policy updates_insert on public.property_update_requests
  for insert to authenticated with check (submitted_by_user_id = auth.uid());

drop policy if exists updates_update on public.property_update_requests;
create policy updates_update on public.property_update_requests
  for update to authenticated
  using (public.is_admin() or (submitted_by_user_id = auth.uid() and status in ('pending_review','needs_changes')))
  with check (public.is_admin() or submitted_by_user_id = auth.uid());

drop policy if exists updates_admin_delete on public.property_update_requests;
create policy updates_admin_delete on public.property_update_requests
  for delete to authenticated using (public.is_admin());

-- ---- audit_logs -------------------------------------------------------------
drop policy if exists audit_select on public.audit_logs;
create policy audit_select on public.audit_logs
  for select to authenticated using (public.is_admin());

drop policy if exists audit_insert on public.audit_logs;
create policy audit_insert on public.audit_logs
  for insert to authenticated with check (public.is_admin());

-- =============================================================================
-- End of migration 0002.
-- =============================================================================
