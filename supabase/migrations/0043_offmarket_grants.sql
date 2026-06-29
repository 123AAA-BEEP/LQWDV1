-- 0043_offmarket_grants.sql
-- BUGFIX: off_market_listings was created (0037) with RLS policies but no
-- table-level GRANTs to the `authenticated` role. RLS only filters rows AFTER
-- the role has base-table privileges, so every API query returned
-- "permission denied for table off_market_listings" — which the Supabase client
-- swallows into an empty result. The board therefore showed 0 listings for
-- everyone (and posting would have failed), even though 401 rows exist.
--
-- Grant DML to `authenticated`; RLS (0037 + 0042) still enforces who sees and
-- writes what. Do NOT grant to `anon` — the board is private to verified users.

grant select, insert, update, delete
  on public.off_market_listings
  to authenticated;
