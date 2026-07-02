-- 0049_offmarket_enrich_tracking.sql
-- Tracks which sourced listings the ICIWorld contact-enrichment has already
-- attempted, so pages that fail to fetch/parse aren't retried in an infinite
-- loop by the auto-continuing enrich run (mode=enrich&force=1 re-attempts).

alter table public.off_market_listings
  add column if not exists enrich_attempted_at timestamptz;
