-- Discovery engine: addresses lead, names trigger.
--
-- discovery_watch  = pre-name pipeline. Development applications (city planning
--                    data) and other address-first sources land here, months or
--                    years before marketing exists. No public page yet — there's
--                    nothing to rank for without a name.
-- discovery_signals = name-bearing sightings (UrbanToronto database entries,
--                    ad creatives, sweeps). The moment a signal matches a
--                    watched address, it's "go time": the signal is fed through
--                    the email-intake ingest pipeline and published.
--
-- Both admin-only (service-role writes from sweeps; admins read/manage in the
-- Discovery tab). Remember the grant rule: RLS without GRANT = silent empty.

create table if not exists public.discovery_watch (
  id uuid primary key default gen_random_uuid(),
  source text not null,                -- 'toronto_opendata' | 'urbantoronto' | 'manual' | ...
  source_ref text,                     -- application # / external id (dedup key per source)
  address_full text,
  address_norm text,                   -- normalized street key for matching
  city text,
  description text,                    -- proposal description from the application
  units integer,
  storeys integer,
  developer_name text,
  application_type text,               -- OPA / Rezoning / Site Plan / ...
  application_status text,
  project_name text,                   -- filled when a name signal matches
  matched_project_id uuid references public.projects(id) on delete set null,
  status text not null default 'watching',  -- watching | matched | published | dismissed
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notes text
);

create unique index if not exists discovery_watch_source_ref_uniq
  on public.discovery_watch (source, source_ref)
  where source_ref is not null;
create index if not exists discovery_watch_city_addr_idx
  on public.discovery_watch (city, address_norm);
create index if not exists discovery_watch_status_idx
  on public.discovery_watch (status);

create table if not exists public.discovery_signals (
  id uuid primary key default gen_random_uuid(),
  source text not null,                -- 'urbantoronto' | 'meta_ads' | 'manual' | ...
  source_url text,
  project_name text not null,
  builder_name text,
  address_full text,
  address_norm text,
  city text,
  raw jsonb,                           -- source payload for debugging/enrichment
  status text not null default 'new',  -- new | matched | ingested | duplicate | dismissed | error
  matched_watch_id uuid references public.discovery_watch(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

-- One signal per (source, name, city) — re-sweeps must not re-process.
create unique index if not exists discovery_signals_dedup_uniq
  on public.discovery_signals (source, lower(project_name), coalesce(lower(city), ''));
create index if not exists discovery_signals_status_idx
  on public.discovery_signals (status);

-- The known universe of builders/developers (BILD membership, our own project
-- data, manual adds). Cross-reference: a signal naming a known builder is
-- higher-confidence; the registry is also the target list for future
-- builder-site sitemap sweeps.
create table if not exists public.discovery_builders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_norm text not null,             -- lowercased/stripped for matching
  website text,
  source text not null default 'manual',  -- 'bild' | 'projects' | 'manual'
  city_region text,
  last_swept_at timestamptz,
  first_seen_at timestamptz not null default now(),
  notes text
);
create unique index if not exists discovery_builders_name_uniq
  on public.discovery_builders (name_norm);

alter table public.discovery_watch enable row level security;
alter table public.discovery_signals enable row level security;
alter table public.discovery_builders enable row level security;

drop policy if exists "discovery_builders admin all" on public.discovery_builders;
create policy "discovery_builders admin all" on public.discovery_builders
  for all using (public.is_admin()) with check (public.is_admin());

grant all on public.discovery_builders to authenticated;
grant all on public.discovery_builders to service_role;

drop policy if exists "discovery_watch admin all" on public.discovery_watch;
create policy "discovery_watch admin all" on public.discovery_watch
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "discovery_signals admin all" on public.discovery_signals;
create policy "discovery_signals admin all" on public.discovery_signals
  for all using (public.is_admin()) with check (public.is_admin());

grant all on public.discovery_watch to authenticated;
grant all on public.discovery_signals to authenticated;
grant all on public.discovery_watch to service_role;
grant all on public.discovery_signals to service_role;
