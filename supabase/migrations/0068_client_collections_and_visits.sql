-- 0068: client collections (shareable curated micro-pages) + link-visit log +
--       first-lead celebration flag.
--
-- CLIENT COLLECTIONS — "5 projects for the Smiths". An agent curates projects
-- for a specific client; the client gets a tokenized micro-page with the
-- agent's identity on top, and every project card carries the agent's ?ref=
-- code so inquiries route to them. The token IS the capability: no anon RLS
-- read — the public page resolves it with the service-role client, and
-- revoked_at kills the link instantly.
--
-- PORTAL-READY BY DESIGN: `extras` is the (initially empty) per-collection
-- unlock map for the coming buyer-portal layer — agent-selected depth like
-- floor-plan documents or incentive details. Whatever goes in there, the
-- rendering path NEVER reads project_private_commercials: commission data
-- stays structurally impossible to share, not merely filtered out.
--
-- LINK VISITS — proof-it-works analytics. One row per tracked page view
-- (ref'd project page, collection page). Service-role writes only; agents
-- read their own rows (Lead Pages stats + weekly digest).

create table if not exists public.client_collections (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token      text not null unique,
  title      text not null,
  note       text,
  extras     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint client_collections_title_len
    check (char_length(title) between 1 and 120),
  constraint client_collections_note_len
    check (note is null or char_length(note) <= 1000)
);
create index if not exists client_collections_profile_idx
  on public.client_collections (profile_id, created_at desc);
create index if not exists client_collections_token_idx
  on public.client_collections (token);

alter table public.client_collections enable row level security;

drop policy if exists "client_collections_owner_all" on public.client_collections;
create policy "client_collections_owner_all" on public.client_collections
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant all on public.client_collections to authenticated;
grant all on public.client_collections to service_role;

create table if not exists public.client_collection_items (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.client_collections (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  unique (collection_id, project_id)
);
create index if not exists client_collection_items_coll_idx
  on public.client_collection_items (collection_id, sort_order);

alter table public.client_collection_items enable row level security;

drop policy if exists "client_collection_items_owner_all" on public.client_collection_items;
create policy "client_collection_items_owner_all" on public.client_collection_items
  for all using (
    exists (
      select 1 from public.client_collections c
      where c.id = collection_id and c.profile_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.client_collections c
      where c.id = collection_id and c.profile_id = auth.uid()
    )
  );

grant all on public.client_collection_items to authenticated;
grant all on public.client_collection_items to service_role;

-- ---------------------------------------------------------------------------
-- Link-visit log
-- ---------------------------------------------------------------------------
create table if not exists public.link_visits (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  project_id    uuid references public.projects (id) on delete set null,
  collection_id uuid references public.client_collections (id) on delete set null,
  source        text not null default 'ref'
    check (source in ('ref', 'collection', 'profile')),
  created_at    timestamptz not null default now()
);
create index if not exists link_visits_profile_idx
  on public.link_visits (profile_id, created_at desc);
create index if not exists link_visits_project_idx
  on public.link_visits (project_id, created_at desc);

alter table public.link_visits enable row level security;

drop policy if exists "link_visits_owner_read" on public.link_visits;
create policy "link_visits_owner_read" on public.link_visits
  for select using (auth.uid() = profile_id);

grant select on public.link_visits to authenticated;
grant all on public.link_visits to service_role;

-- ---------------------------------------------------------------------------
-- First-lead celebration (confetti moment #3; "time to first lead" metric is
-- derivable as min(project_leads.created_at) - reco_verified_at).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists first_lead_celebrated_at timestamptz;
