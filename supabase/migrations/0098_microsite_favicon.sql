-- =============================================================================
-- LIQWD — Migration 0098: microsite favicon
-- -----------------------------------------------------------------------------
-- Per-microsite site icon: shows in the browser tab AND beside the listing
-- in Google search results (Google requires a square icon, at least 48x48,
-- served from a stable URL). Config-level like builder_logo_url, so it never
-- needs a regeneration and regeneration never touches it.
-- =============================================================================

alter table public.microsite_configs
  add column if not exists favicon_url text;
