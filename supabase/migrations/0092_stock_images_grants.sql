-- =============================================================================
-- LIQWD — Migration 0092: microsite_stock_images grants (bug fix)
-- -----------------------------------------------------------------------------
-- 0090 created the table + RLS policy but the base table GRANTs for the
-- `authenticated` role never materialized (unlike microsite_configs in 0089),
-- so every admin read/insert failed with 42501 before RLS was even evaluated —
-- the stock admin page showed zeros while uploads landed in the bucket.
-- RLS (admin-only policy from 0090) still governs actual access.
-- =============================================================================

grant select, insert, update, delete on public.microsite_stock_images to authenticated;
