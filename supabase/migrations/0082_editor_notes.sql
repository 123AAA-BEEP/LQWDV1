-- =============================================================================
-- LIQWD — Migration 0082: editor_notes on articles
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Stores the editor-in-chief agent's notes on each finished piece (what it
--   changed; for held pieces, exactly what a human must verify). Shown in the
--   admin article editor. Admin-only via the existing base-table RLS; not
--   exposed on public_articles_view.
--
-- EXECUTION ORDER
--   Run after 0081_brokerage_article_types.sql.
-- =============================================================================

alter table public.articles add column if not exists editor_notes text;
