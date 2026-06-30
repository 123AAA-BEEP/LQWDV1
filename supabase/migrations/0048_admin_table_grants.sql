-- 0048_admin_table_grants.sql
-- BUGFIX (recurring): several tables were created with RLS policies but never
-- granted base-table privileges to the `authenticated` role. RLS only filters
-- rows AFTER the role can touch the table, so every session-client query
-- returned "permission denied", which the Supabase client turns into an empty
-- result — pages rendered blank and saves silently no-op'd, even though the
-- service-role (webhooks / server jobs) could read + write fine.
--
-- This bit:
--   - off_market_listings (fixed in 0043)
--   - email_intake_log  -> Email intake panel showed 0 despite rows
--   - referrals + rewards_ledger -> admin Rewards tab + realtor Refer page blank
--   - seo_prompt_settings -> Admin Settings showed nothing + saving failed
--
-- Grant DML; the existing RLS policies still gate which rows/operations each
-- role gets (owner-or-admin reads, admin writes). `anon` stays excluded.
-- (iciworld_raw is intentionally service-role-only — no session reads it.)

grant select, insert, update, delete on public.email_intake_log to authenticated;
grant select, insert, update, delete on public.referrals to authenticated;
grant select, insert, update, delete on public.rewards_ledger to authenticated;
grant select, insert, update, delete on public.seo_prompt_settings to authenticated;
