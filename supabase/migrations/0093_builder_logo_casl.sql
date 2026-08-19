-- =============================================================================
-- LIQWD — Migration 0093: builder logo + CASL consent
-- -----------------------------------------------------------------------------
-- 1. microsite_configs.builder_logo_url — the developer's logo (uploaded by
--    the admin or pasted as a URL); rendered in the "About the developer"
--    section of the microsite.
-- 2. project_leads.casl_consent — explicit CASL express consent captured by
--    an affirmative (unchecked-by-default) checkbox on microsite lead forms,
--    replacing implied-by-submission consent language.
-- =============================================================================

alter table public.microsite_configs
  add column if not exists builder_logo_url text;

alter table public.project_leads
  add column if not exists casl_consent boolean not null default false;
