-- 0064: one-time "you're verified" celebration flag.
--
-- The approved-confetti must fire exactly once per account, across devices
-- and regardless of HOW approval happened (manual admin review discovered on
-- a later login, or instant auto-verification seconds after submitting). A DB
-- flag is the only guard that survives all paths; sessionStorage only guards
-- same-tab refreshes.
--
-- RLS: the existing owner update policy on profiles covers this column, and
-- the protect_profile_sensitive_fields trigger only blocks role /
-- verification_status (and tier) changes — so the owner can stamp it.

alter table public.profiles
  add column if not exists verification_celebrated_at timestamptz;
