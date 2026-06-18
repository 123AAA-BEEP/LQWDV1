-- =============================================================================
-- 0018_restore_service_role_grants.sql — fix server-side admin client writes.
--
-- The `service_role` DB role was missing DML on public tables (e.g. it had no
-- INSERT/UPDATE/DELETE/SELECT on `profiles`), so the server-side admin client
-- (createAdminClient, used for RECO auto-verify, connect-contact reveal, etc.)
-- got "42501 permission denied for table profiles" and writes silently failed.
--
-- Restore the standard Supabase service_role privileges across the public
-- schema and set default privileges for future tables. service_role is used
-- only server-side (secret key) and bypasses RLS by design — safe to grant.
-- Idempotent. Applied to the live DB.
-- =============================================================================

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;
