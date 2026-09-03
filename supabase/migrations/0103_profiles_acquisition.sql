-- =============================================================================
-- LIQWD — Migration 0103: ad attribution on profiles
-- First-touch acquisition data (utm_*, gclid/gbraid/wbraid/fbclid, landing
-- path, referrer host, timestamp) captured by the proxy on the ad click,
-- carried through signup as auth metadata, and stamped here on profile
-- bootstrap. signup_conversion_fired_at makes the Google Ads conversion
-- fire exactly once per account. Admin/owner-only by existing RLS; neither
-- column is exposed through public_realtor_cards or the broker views.
-- Applied live 2026-09-03 via MCP.
-- =============================================================================

alter table public.profiles
  add column if not exists acquisition jsonb,
  add column if not exists signup_conversion_fired_at timestamptz;
