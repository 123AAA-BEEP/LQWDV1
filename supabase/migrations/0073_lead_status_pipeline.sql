-- =============================================================================
-- LIQWD — Migration 0073: Lead status pipeline (won/lost) for the Leads workspace
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Aligns the `project_leads.status` check constraint with the pipeline the
--   app actually uses (`src/lib/leads.ts`): new → contacted → qualified →
--   won / lost.
--
--   The original 0001 constraint allowed ('new','contacted','qualified',
--   'closed','spam'), but the shared status lib (and the admin Leads UI built
--   on it) writes 'won' and 'lost' — so those updates have been silently
--   rejected by the check constraint. This migration replaces the constraint
--   with the app's real vocabulary. 'spam' is kept as an admin hygiene value;
--   'closed' is dropped — zero rows use it and nothing in the codebase writes
--   it (verified in the live DB: all leads are 'new').
--
--   This unblocks BOTH the admin leads queue and the new realtor Leads
--   workspace (/dashboard/leads), which share the same status lib and now let
--   the assigned agent work a lead through the pipeline (RLS `leads_update`
--   from 0002 already permits the assigned realtor to update their own leads).
--
--   Additive/behavioural only — no columns, no RLS, no data changes.
--
-- EXECUTION ORDER
--   Run after 0072_assignment_listings.sql.
-- =============================================================================

alter table public.project_leads
  drop constraint if exists project_leads_status_chk;

alter table public.project_leads
  add constraint project_leads_status_chk
  check (status in ('new', 'contacted', 'qualified', 'won', 'lost', 'spam'));
