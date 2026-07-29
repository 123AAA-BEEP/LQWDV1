-- =============================================================================
-- LIQWD — Migration 0080: agent_guide article type (evergreen agent content)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds 'agent_guide' to the articles type constraint: evergreen,
--   hand-written (or hand-finished) pieces aimed at agents — new-licensee
--   guides, brokerage-selection frameworks — published on /insights alongside
--   the consumer content. These are NOT project-grounded, so the AI generate
--   flow excludes them; they enter as blank drafts and are written/reviewed
--   by a human. Same review gate as everything else.
--
-- EXECUTION ORDER
--   Run after 0079_page_events.sql.
-- =============================================================================

alter table public.articles drop constraint if exists articles_type_chk;
alter table public.articles add constraint articles_type_chk
  check (article_type in (
    'project_spotlight',
    'neighbourhood_guide',
    'comparison',
    'market_update',
    'agent_guide'
  ));
