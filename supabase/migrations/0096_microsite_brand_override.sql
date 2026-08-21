-- =============================================================================
-- LIQWD — Migration 0096: microsite brand override
-- -----------------------------------------------------------------------------
-- Founder-pinned visual identity {primary, accent, heading_font, font_stack},
-- set by hand or extracted on demand from ANY project image (logo, site map,
-- rendering). Lives on the CONFIG rather than inside `content`, so — exactly
-- like image_slots — regeneration can never overwrite it, and it can be set
-- before any content exists. The renderer prefers it over the brand the
-- generator extracted from the hero.
-- =============================================================================

alter table public.microsite_configs
  add column if not exists brand_override jsonb;
