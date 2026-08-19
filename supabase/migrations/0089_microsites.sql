-- =============================================================================
-- LIQWD — Migration 0089: microsite_configs + project_leads.source
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   The microsite rail (first site: echotownswaterdown.com → Echo Stacked
--   Towns, Waterdown). Each row is one standalone lead-gen landing site:
--   a purchased domain, the project it grounds in, the founder's context
--   questionnaire (docs/microsite-context-questionnaire.md) as jsonb, the
--   generated page content (reviewed in admin before going live), and a
--   capture key. Serving: the proxy rewrites foreign hosts to /sites/[domain]
--   inside the main app — same repo, same DB, zero sync. Unknown or
--   non-live domains render a noindex holding page, never liqwd.ca content
--   (duplicate-content guard).
--
--   Also adds project_leads.source — lead provenance for all funnels
--   (microsite domain stamped on capture).
--
-- EXECUTION ORDER
--   Run after 0088_newsletter_sends.sql.
-- =============================================================================

create table if not exists public.microsite_configs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  domain          text not null unique,
  project_id      uuid not null,
  skin            text not null default 'classic',
  status          text not null default 'draft',
  context         jsonb not null default '{}'::jsonb,
  content         jsonb,
  capture_key     uuid not null default gen_random_uuid(),
  constraint microsite_status_chk check (status in ('draft', 'live', 'retired')),
  constraint microsite_domain_chk check (domain ~ '^[a-z0-9.-]{4,253}$')
);

alter table public.microsite_configs enable row level security;

drop policy if exists microsites_admin_all on public.microsite_configs;
create policy microsites_admin_all on public.microsite_configs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.microsite_configs to authenticated;

-- Lead provenance across all funnels (microsite domains, future sources).
alter table public.project_leads add column if not exists source text;
