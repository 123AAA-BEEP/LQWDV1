-- =============================================================================
-- LIQWD — Migration 0091: Microsite lead flow
-- -----------------------------------------------------------------------------
-- 1. project_leads.address — optional address field on microsite lead forms
--    (The Valley pattern: name/email/phone/agent required, address optional).
-- 2. microsite_configs.auto_send_details + details_url — the admin-toggleable
--    automation that emails a new lead the project details link (a custom
--    URL, e.g. a Google Drive package, or the liqwd.ca listing by default).
-- =============================================================================

alter table public.project_leads
  add column if not exists address text;

alter table public.microsite_configs
  add column if not exists auto_send_details boolean not null default false;

alter table public.microsite_configs
  add column if not exists details_url text;
