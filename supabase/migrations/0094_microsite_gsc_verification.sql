-- =============================================================================
-- LIQWD — Migration 0094: microsite Google Search Console verification
-- -----------------------------------------------------------------------------
-- Holds either form of GSC's URL-prefix verification for a microsite domain:
--   * the meta-tag token (rendered as <meta name="google-site-verification">)
--   * or the HTML filename GSC hands out ("googleabc123.html"), which the
--     domain's catch-all route then serves with the expected body.
-- (Domain-property verification uses a DNS TXT record instead and needs no
-- app support.)
-- =============================================================================

alter table public.microsite_configs
  add column if not exists google_verification text;
