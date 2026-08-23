-- =============================================================================
-- LIQWD — Migration 0097: microsite map address override
-- -----------------------------------------------------------------------------
-- What the Location section's map pin and heading use, when the project's
-- own address is missing, wrong, or pins badly (an intersection like
-- "Weston Rd & Teston Rd, Vaughan" often drops a better pin than a civic
-- address on a greenfield site). Config-level like image_slots and
-- brand_override, so it never needs a regeneration and regeneration never
-- overwrites it. Blank = fall back to the project address.
-- =============================================================================

alter table public.microsite_configs
  add column if not exists map_address text;
