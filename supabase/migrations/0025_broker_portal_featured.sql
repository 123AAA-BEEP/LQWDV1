-- =============================================================================
-- LIQWD — Migration 0025: project_broker_portals.is_featured (paid placement)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds an is_featured flag so a broker portal can be promoted (sponsored) at
--   the top of the Broker Portals directory — the paid-ad slot.
--
-- EXECUTION ORDER
--   Runs after 0024. Already applied to the live DB as `broker_portal_featured`.
--
-- SAFE TO RE-RUN?  Yes (add column if not exists; partial index if not exists).
-- =============================================================================

alter table public.project_broker_portals
  add column if not exists is_featured boolean not null default false;

create index if not exists idx_broker_portals_featured
  on public.project_broker_portals (is_featured)
  where is_featured;

-- =============================================================================
-- End of migration 0025.
-- =============================================================================
