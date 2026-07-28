-- =============================================================================
-- LIQWD — Migration 0078: articles (AI-drafted, human-reviewed SEO content)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   The content half of the growth engine: data-grounded articles
--   (project spotlights, neighbourhood guides, comparisons, market updates)
--   drafted by AI from PUBLIC-SAFE project data, reviewed by a human in the
--   admin console, and published at /insights/{slug}.
--
--   Adapted from the uploaded growth-engine build prompt (which targeted the
--   0003-era schema): same product shape, renumbered and fitted to current
--   patterns. Human review is mandatory — nothing auto-publishes; the status
--   flow is draft → in_review → published → archived.
--
--   Public reads go through public_articles_view (definer, published +
--   indexable only) — the base table is admin-only, mirroring the
--   projects/provenance invariant.
--
-- EXECUTION ORDER
--   Run after 0077_assignment_intake.sql.
-- =============================================================================

create table if not exists public.articles (
  id                             uuid primary key default gen_random_uuid(),
  slug                           text not null unique,
  status                         text not null default 'draft',
  article_type                   text not null,
  title                          text not null,
  excerpt                        text,
  body_md                        text not null default '',
  seo_title                      text,
  seo_meta_description           text,
  hero_image_url                 text,
  related_project_ids            uuid[] not null default '{}',
  attributed_realtor_profile_id  uuid references public.profiles (id) on delete set null,
  generated_by_ai                boolean not null default true,
  indexable                      boolean not null default true,
  published_at                   timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now(),
  constraint articles_status_chk
    check (status in ('draft', 'in_review', 'published', 'archived')),
  constraint articles_type_chk
    check (article_type in ('project_spotlight', 'neighbourhood_guide', 'comparison', 'market_update')),
  constraint articles_slug_chk check (slug ~ '^[a-z0-9-]{3,120}$')
);

create index if not exists idx_articles_status on public.articles (status);
create index if not exists idx_articles_published_at
  on public.articles (published_at desc) where status = 'published';

alter table public.articles enable row level security;

-- Admin-only base table (mirrors the projects invariant).
drop policy if exists articles_admin_all on public.articles;
create policy articles_admin_all on public.articles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.articles to authenticated;

-- Public read surface: published + indexable-agnostic (indexable controls
-- robots meta, not visibility), public-safe columns only.
create or replace view public.public_articles_view as
select
  a.id,
  a.slug,
  a.article_type,
  a.title,
  a.excerpt,
  a.body_md,
  a.seo_title,
  a.seo_meta_description,
  a.hero_image_url,
  a.related_project_ids,
  a.indexable,
  a.published_at
from public.articles a
where a.status = 'published';

grant select on public.public_articles_view to anon, authenticated;
