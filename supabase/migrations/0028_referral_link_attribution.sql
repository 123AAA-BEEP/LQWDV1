-- =============================================================================
-- LIQWD — Migration 0028: Realtor project referral-link attribution
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds per-realtor attribution for the new "Lead Pages" tool. A realtor can
--   hand a buyer a direct link to a project's public page that carries their
--   referral code:   /projects/<slug>?ref=<referral_code>
--
--   When a lead is captured through such a link, the public lead action records
--   the sharing realtor in `referred_by_profile_id` AND routes the lead to them
--   (assigned_realtor_profile_id) — the link sharer wins over the page's default
--   steward. Links WITHOUT a ?ref still route to the page steward exactly as
--   before, so organic lead routing is unchanged.
--
--   This change is additive and backwards-compatible: one new nullable column +
--   an index. No existing rows, policies, or routing behaviour change.
--
-- EXECUTION ORDER
--   Run after 0026_broker_portal_events.sql (the highest migration on main).
--   NOTE: a separate feature branch carries an unrelated 0027 (broker-portal
--   suggestions); this file is numbered 0028 to avoid colliding with it.
--
-- SAFE TO RE-RUN?
--   Yes. The column and index are guarded with IF NOT EXISTS.
--
-- RLS
--   No policy change required. The existing 0002 policies already let a realtor
--   read/manage leads where `assigned_realtor_profile_id = auth.uid()`; because
--   referral-link leads are always assigned to the referrer, those leads are
--   already visible to the realtor who referred them.
-- =============================================================================

alter table public.project_leads
  add column if not exists referred_by_profile_id uuid
    references public.profiles (id) on delete set null;

create index if not exists idx_project_leads_referred_by
  on public.project_leads (referred_by_profile_id);

comment on column public.project_leads.referred_by_profile_id is
  'Realtor whose direct referral link (/projects/<slug>?ref=<referral_code>) captured this lead. When set, the lead is also routed to this realtor via assigned_realtor_profile_id (link sharer wins over the page steward). NULL for organic captures.';

-- =============================================================================
-- End of migration 0028.
-- =============================================================================
