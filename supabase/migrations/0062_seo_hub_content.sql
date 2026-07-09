-- 0062: cached SEO copy for programmatic hub pages (cities + builders).
--
-- Hub pages (/new-homes/{city}, /builders/{slug}) rank for the category head
-- terms that carry far more volume than any single project name. The DATA on
-- those pages (counts, price bands, type mix) is computed live from inventory
-- and is always true; the PROSE (market overview, investor/first-time
-- education, FAQ) is AI-generated once per hub and cached here so it isn't
-- regenerated on every request. Public-safe content only — no provenance.
--
-- Prose is gated on inventory depth at generation time (a hub with too few
-- projects gets no row and renders data-only), which keeps thin/doorway pages
-- off the domain.

create table if not exists public.seo_hub_content (
  id             uuid primary key default gen_random_uuid(),
  hub_type       text not null check (hub_type in ('city', 'builder')),
  hub_key        text not null,          -- canonical city or builder name
  slug           text not null,
  province       text,                   -- drives jurisdiction (city hubs)
  intro          text,                   -- market overview prose
  investor       text,                   -- investor education (non-promissory)
  first_time     text,                   -- first-time buyer education
  how_it_works   text,                   -- how pre-con works in this jurisdiction
  faq            jsonb,                  -- [{question, answer}]
  meta_title     text,
  meta_description text,
  project_count  integer,                -- inventory snapshot at generation
  generated_at   timestamptz not null default now(),
  unique (hub_type, hub_key)
);

create index if not exists seo_hub_content_lookup_idx
  on public.seo_hub_content (hub_type, slug);

alter table public.seo_hub_content enable row level security;

-- Public read: this is public-safe marketing copy rendered on public pages.
create policy "seo_hub_content_public_read" on public.seo_hub_content
  for select using (true);

grant select on public.seo_hub_content to anon, authenticated;
grant all on public.seo_hub_content to service_role;
