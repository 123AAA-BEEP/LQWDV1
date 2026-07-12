-- 0063: public realtor profile pages (/realtors/{slug}) + curated picks.
--
-- The freemium mechanic: every verified, opted-in agent gets a free public
-- page. FREE tier = a few self-picked projects (their picks link with their
-- ?ref= code so the page's leads route to THEM) PLUS LIQWD-curated featured
-- placements for their market (the monetizable surface — developer-paid
-- placements ride free pages). PRO tier = unlimited picks, no injected
-- placements, full control. The page itself is free forever; the curation
-- rights are the product.

-- 1) Stable public slug for agents (person names collide — never slugify on
--    read like builders; store it).
alter table public.profiles add column if not exists slug text;
create unique index if not exists profiles_slug_key
  on public.profiles (slug) where slug is not null;

-- Backfill for already-approved realtors: first-last, de-collided with a
-- 4-char id fragment when needed.
with base as (
  select id,
    nullif(
      regexp_replace(
        regexp_replace(lower(trim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))),
                       '[^a-z0-9 ]', '', 'g'),
        '\s+', '-', 'g'),
      '') as b
  from public.profiles
  where role = 'realtor' and verification_status = 'approved' and slug is null
),
named as (
  select id, b,
    case when count(*) over (partition by b) > 1
         then b || '-' || substr(replace(id::text, '-', ''), 1, 4)
         else b end as s
  from base where b is not null
)
update public.profiles p set slug = named.s
from named where p.id = named.id;

-- 2) Widen the public card view (append-only — CREATE OR REPLACE requires the
--    original column order preserved). New: slug, avatar_url, bio_short,
--    service_area, referral_code (already semi-public by design — it lives in
--    share links), and is_pro (gates the injected-placement rendering).
create or replace view public.public_realtor_cards as
select
  p.id          as profile_id,
  p.first_name  as first_name,
  p.last_name   as last_name,
  p.title       as title,
  coalesce(b.brokerage_name, p.brokerage_name) as brokerage,
  p.email       as email,   -- optional public field
  p.phone       as phone,   -- optional public field
  p.slug        as slug,
  p.avatar_url  as avatar_url,
  p.bio_short   as bio_short,
  p.service_area as service_area,
  p.referral_code as referral_code,
  (p.plan in ('pro','ultra')
    or p.realtor_tier in ('pro','ultra')
    or (p.pro_until is not null and p.pro_until > now())) as is_pro
from public.profiles p
left join public.brokerages b on b.id = p.brokerage_id
where p.is_public_profile_enabled = true
  and p.verification_status = 'approved';

-- 3) The agent's self-picked projects for their page.
create table if not exists public.realtor_page_projects (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, project_id)
);
create index if not exists realtor_page_projects_profile_idx
  on public.realtor_page_projects (profile_id, sort_order);

alter table public.realtor_page_projects enable row level security;

-- Public may read picks only for agents whose page is public (mirrors the
-- card view's gate); owners manage their own rows. Tier caps are enforced in
-- the server action (free tier: small fixed number of picks).
create policy "realtor_page_projects_public_read" on public.realtor_page_projects
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.is_public_profile_enabled = true
        and p.verification_status = 'approved'
    )
    or auth.uid() = profile_id
  );
create policy "realtor_page_projects_owner_write" on public.realtor_page_projects
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant select on public.realtor_page_projects to anon, authenticated;
grant all on public.realtor_page_projects to authenticated;
grant all on public.realtor_page_projects to service_role;
