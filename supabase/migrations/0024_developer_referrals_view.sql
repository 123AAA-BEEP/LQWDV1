-- =============================================================================
-- LIQWD — Migration 0024: developer_referrals_view
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   A SECURITY DEFINER view so a granted developer can see + work the rental
--   referrals for THEIR projects. Base `projects` is admin-only (migration
--   0004), so a plain/invoker view would return nothing for developers; this
--   definer view bypasses RLS but is gated per-caller by has_project_access()
--   and exposes only safe fields (no provenance). Status edits still go through
--   rental_referrals (RLS: granted developer may update when service_mode =
--   'self_serve').
--
-- EXECUTION ORDER
--   Runs after 0023. Already applied to the live DB as `developer_referrals_view`.
--
-- PREREQUISITES
--   0002 has_project_access(), 0021 project_rental_referral_terms, 0023
--   rental_referrals.
--
-- SAFE TO RE-RUN?  Yes (create or replace view).
--
-- NOTE
--   Supabase's linter flags this as a "security definer view" — expected, like
--   broker_projects_view / public_projects_view. Row access is gated in the WHERE.
-- =============================================================================

create or replace view public.developer_referrals_view as
select
  rr.id,
  rr.project_id,
  p.project_name,
  p.city,
  rr.client_first_name,
  rr.client_last_name,
  rr.client_email,
  rr.client_phone,
  rr.message,
  rr.status,
  rr.developer_response_notes,
  rr.created_at,
  t.service_mode
from public.rental_referrals rr
join public.projects p on p.id = rr.project_id
left join public.project_rental_referral_terms t on t.project_id = rr.project_id
where public.has_project_access(rr.project_id, 'developer_restricted');

grant select on public.developer_referrals_view to authenticated, service_role;

-- =============================================================================
-- End of migration 0024.
-- =============================================================================
