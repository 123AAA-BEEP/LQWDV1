-- =============================================================================
-- LIQWD — Migration 0095: microsite image slots
-- -----------------------------------------------------------------------------
-- Manual image placement per microsite (founder rule: every auto-selected
-- image must be overridable). Shape:
--   { "intro": "<url>" | "none", "sections": { "<sectionKey|iN>": "<url>" | "none" } }
-- Absent slot = automatic pick (real gallery first, themed stock fallback).
-- Lives on the CONFIG, not the content, so regeneration never disturbs it.
-- =============================================================================

alter table public.microsite_configs
  add column if not exists image_slots jsonb not null default '{}'::jsonb;
