-- =============================================================================
-- LIQWD — Migration 0099: Playbook System foundations — the Vault
-- (migrations-spec 0001, founder-approved 2026-09-01)
-- -----------------------------------------------------------------------------
-- Realtor Vault (citable identity; playbooks may only cite verified fields),
-- Agent Brand assets (rights-attested), Market Vault datasets (every number
-- carries a source), Compliance Vault (versioned lintable rules, seeded from
-- playbook-system/compliance/rulebook-v1.md).
-- =============================================================================

-- ---- Realtor Vault ----------------------------------------------------------
create table if not exists public.realtor_vault (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  name_as_registered text,
  trade_name text,
  title text check (title in ('Salesperson', 'Broker', 'Broker of Record') or title is null),
  name_verified_at timestamptz,
  reco_number text,
  reco_verified_at timestamptz,
  brokerage_name text,
  brokerage_address text,
  brokerage_verified_at timestamptz,
  phone text,
  email text,
  service_neighbourhoods text[] not null default '{}',
  review_sources jsonb not null default '[]'::jsonb,
  voice jsonb not null default '{}'::jsonb,
  brand_colors jsonb,
  flavour text,
  brand_mode text check (brand_mode in ('match', 'brand_first') or brand_mode is null),
  updated_at timestamptz not null default now()
);

alter table public.realtor_vault enable row level security;
create policy realtor_vault_admin_all on public.realtor_vault
  for all using (public.is_admin()) with check (public.is_admin());
create policy realtor_vault_owner_read on public.realtor_vault
  for select using (profile_id = auth.uid());

-- The completeness meter (playbook precondition nodes + onboarding both read it).
create or replace view public.realtor_vault_completeness with (security_invoker = true) as
select
  v.profile_id,
  (
    (v.trade_name is not null)::int + (v.title is not null)::int +
    (v.phone is not null)::int + (v.email is not null)::int +
    (v.brokerage_name is not null)::int + (v.reco_number is not null)::int +
    (coalesce(array_length(v.service_neighbourhoods, 1), 0) > 0)::int +
    (v.voice != '{}'::jsonb)::int
  ) * 100 / 8 as percent_complete,
  (v.name_verified_at is not null and v.reco_verified_at is not null
    and v.brokerage_verified_at is not null) as identity_verified
from public.realtor_vault v;

-- ---- Agent Brand assets -----------------------------------------------------
create table if not exists public.agent_brand_assets (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in
    ('logo', 'logo_variant', 'headshot', 'team_photo', 'brokerage_logo', 'library_image')),
  storage_path text not null,
  derived jsonb not null default '{}'::jsonb,
  -- PB rule PHOTO-1: a library image without an attestation can never be used.
  rights_attested_at timestamptz,
  version int not null default 1,
  superseded_by uuid references public.agent_brand_assets(id),
  created_at timestamptz not null default now()
);
create index if not exists agent_brand_assets_profile_idx
  on public.agent_brand_assets(profile_id);

alter table public.agent_brand_assets enable row level security;
create policy agent_brand_admin_all on public.agent_brand_assets
  for all using (public.is_admin()) with check (public.is_admin());
create policy agent_brand_owner_read on public.agent_brand_assets
  for select using (profile_id = auth.uid());

-- ---- Market Vault datasets --------------------------------------------------
-- Enforcement surface for "every stat carries a source": published numbers
-- must join here (or to a projects field). Admin-write, service-role read.
create table if not exists public.market_datasets (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('city', 'neighbourhood', 'project')),
  scope_key text not null,
  metric text not null,
  value numeric not null,
  period daterange,
  source text not null check (length(trim(source)) > 0),
  source_url text,
  created_at timestamptz not null default now()
);
create index if not exists market_datasets_scope_idx
  on public.market_datasets(scope, scope_key, metric);

alter table public.market_datasets enable row level security;
create policy market_datasets_admin_all on public.market_datasets
  for all using (public.is_admin()) with check (public.is_admin());

-- ---- Compliance Vault -------------------------------------------------------
create table if not exists public.compliance_rules (
  id text primary key,
  rulebook_version text not null default '1.0',
  category text not null check (category in
    ('reco_advertising', 'trreb_data', 'casl', 'privacy', 'photo_rights', 'claims', 'platform_integrity')),
  severity text not null check (severity in ('block', 'warn')),
  check_kind text not null check (check_kind in ('regex', 'presence', 'llm_judgment', 'structural')),
  check_spec jsonb not null default '{}'::jsonb,
  human_text text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.compliance_rules enable row level security;
create policy compliance_rules_admin_all on public.compliance_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed from rulebook-v1.md (human_text abridged; the doc is the full mirror).
insert into public.compliance_rules (id, category, severity, check_kind, human_text) values
  ('RECO-AD-1', 'reco_advertising', 'block', 'llm_judgment', 'Registrant name exactly as registered (trade_name, fallback name_as_registered, verified). No nicknames in advertising.'),
  ('RECO-AD-2', 'reco_advertising', 'block', 'presence',     'Identification block complete on every advertisement: trade name, title, phone, brokerage name (+ brokerage address where jurisdiction requires), agent email.'),
  ('RECO-AD-3', 'reco_advertising', 'block', 'llm_judgment', 'No misleading claims; superlatives require a substantiating source in the claims manifest.'),
  ('RECO-AD-4', 'reco_advertising', 'warn',  'llm_judgment', 'Team/trade names accompanied by registrant + brokerage identification per RECO guidance.'),
  ('TRREB-DATA-1', 'trreb_data', 'block', 'llm_judgment', 'Sold-data display follows current TRREB/board rules; no sold prices without display rights.'),
  ('TRREB-DATA-2', 'trreb_data', 'block', 'llm_judgment', 'Listings not the agent''s own are never presented as theirs.'),
  ('CLAIM-1', 'claims', 'block', 'structural',   'Every number carries a source (market_datasets join or verified project field).'),
  ('CLAIM-2', 'claims', 'block', 'presence',     'Not-an-appraisal framing on all market/valuation content.'),
  ('CLAIM-3', 'claims', 'block', 'llm_judgment', 'No invented reviews, awards, transactions, or credentials; testimonials only from verified sources.'),
  ('CLAIM-4', 'claims', 'warn',  'llm_judgment', 'No promises of investment returns or appreciation.'),
  ('CLAIM-5', 'claims', 'block', 'llm_judgment', 'Competitor references factual and neutral; comparative claims substantiated with disclosed criteria.'),
  ('CASL-1', 'casl', 'block', 'structural', 'Consent basis recorded per recipient before send.'),
  ('CASL-2', 'casl', 'block', 'presence',   'Sender identification block present.'),
  ('CASL-3', 'casl', 'block', 'presence',   'Functioning unsubscribe present; suppression enforced at infrastructure level.'),
  ('CASL-4', 'casl', 'block', 'structural', 'Suppression list is global across outreach, nurture, and lead auto-send.'),
  ('PRIV-1', 'privacy', 'block', 'llm_judgment', 'Review replies never confirm someone was a client nor reveal transaction details.'),
  ('PRIV-2', 'privacy', 'block', 'structural',   'Responses to reviews of 3 stars or less are always human-approved.'),
  ('PRIV-3', 'privacy', 'warn',  'llm_judgment', 'Sensitive inbound (legal, complaint, refund) auto-escalates to a human.'),
  ('PHOTO-1', 'photo_rights', 'block', 'structural', 'Library images require a usage-rights attestation before use in any output.'),
  ('PHOTO-2', 'photo_rights', 'warn',  'presence',   'Builder renderings labelled artist''s concept / E.&O.E. where shown.'),
  ('PLAT-1', 'platform_integrity', 'block', 'structural', 'No deployed link networks, cloud stacks, or paid placements. Earned channels only.'),
  ('PLAT-2', 'platform_integrity', 'block', 'structural', 'No gray-area indexing APIs or paid indexer services.'),
  ('PLAT-3', 'platform_integrity', 'block', 'structural', 'No unsupervised publishing; the approval queue is the only path to public surfaces. Campaigns publish paused.')
on conflict (id) do nothing;
