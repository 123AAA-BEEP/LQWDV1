-- 0060: Security hardening from the advisor audit.
--
-- 1. off-market-media goes PRIVATE. The off-market board is approved-realtor
--    content, but the bucket was public + listable — anyone with a URL (or a
--    bucket listing) could see the exclusive media. The app now signs
--    time-limited URLs at render; storage RLS gates reads to approved
--    realtors and admins. (No legacy data to migrate: zero images uploaded.)
--
-- 2. Internal functions leave the client RPC surface. Trigger functions
--    don't need caller EXECUTE (PostgreSQL checks the trigger owner, not the
--    DML user), and the anon role never needs the utility helpers. The
--    boolean RLS helpers (is_admin & co) keep their grants — 19 policies
--    with public/anon reach evaluate them.
--
-- 3. Pin search_path on the three functions the linter flagged as mutable.

-- ---- 1. off-market-media: private bucket, gated reads ----------------------
update storage.buckets set public = false where id = 'off-market-media';

drop policy if exists "off_market_media_read" on storage.objects;
create policy "off_market_media_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'off-market-media'
    and (is_approved_realtor() or is_admin())
  );

-- ---- 2. RPC surface hygiene -------------------------------------------------
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.protect_profile_sensitive_fields() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;
-- gen_referral_code stays executable by authenticated: it's the column
-- default on profiles.referral_code, evaluated as the inserting role.
revoke execute on function public.gen_referral_code() from anon;
revoke execute on function public.safe_uuid(text) from anon;

-- ---- 3. Deterministic search_path (linter 0011) ----------------------------
alter function public.set_updated_at() set search_path = public;
alter function public.safe_uuid(text) set search_path = public;
alter function public.gen_referral_code() set search_path = public;
