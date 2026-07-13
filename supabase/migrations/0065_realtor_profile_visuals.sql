-- 0065: realtor profile visuals — banner image, achievements toggle, and
-- self-reported awards for the public agent page (/realtors/{slug}).
--
-- Banner: agents can upload their own (stored in the existing `avatars`
-- bucket at {uid}/banner.{ext} — the 0003 owner-folder policies already
-- cover it); when absent the page falls back to a hero image from the
-- agent's own picked projects, then to the brand gradient.
--
-- Achievements: SYSTEM-computed medals (Founding Agent, Project Steward,
-- Project Scout, Network Builder) are derived live from real data at render
-- time — nothing is stored. `show_achievements` lets the agent hide that
-- whole section. Self-reported awards (brokerage awards etc.) live in
-- `realtor_awards` and are always shown — adding one IS the opt-in.

-- 1) Profile columns.
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles
  add column if not exists show_achievements boolean not null default true;

-- 2) Widen the public card view (append-only — CREATE OR REPLACE requires
--    the original column order preserved; 0063 order kept, new fields last).
--    reco_verified_at powers the Founding Agent medal and is public-register
--    data anyway (never the certificate itself).
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
    or (p.pro_until is not null and p.pro_until > now())) as is_pro,
  p.banner_url        as banner_url,
  p.show_achievements as show_achievements,
  p.reco_verified_at  as reco_verified_at
from public.profiles p
left join public.brokerages b on b.id = p.brokerage_id
where p.is_public_profile_enabled = true
  and p.verification_status = 'approved';

-- 3) Self-reported awards ("Top Producer 2024 — RE/MAX Hallmark" etc.).
create table if not exists public.realtor_awards (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  issuer     text,
  year       int,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  constraint realtor_awards_title_len
    check (char_length(title) between 1 and 120),
  constraint realtor_awards_issuer_len
    check (issuer is null or char_length(issuer) <= 120),
  constraint realtor_awards_year_chk
    check (year is null or year between 1950 and 2100)
);
create index if not exists realtor_awards_profile_idx
  on public.realtor_awards (profile_id, sort_order, created_at);

alter table public.realtor_awards enable row level security;

-- Public may read awards only for agents whose page is public (mirrors
-- realtor_page_projects); owners manage their own rows. The per-agent cap
-- is enforced in the server action.
drop policy if exists "realtor_awards_public_read" on public.realtor_awards;
create policy "realtor_awards_public_read" on public.realtor_awards
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.is_public_profile_enabled = true
        and p.verification_status = 'approved'
    )
    or auth.uid() = profile_id
  );
drop policy if exists "realtor_awards_owner_write" on public.realtor_awards;
create policy "realtor_awards_owner_write" on public.realtor_awards
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant select on public.realtor_awards to anon, authenticated;
grant all on public.realtor_awards to authenticated;
grant all on public.realtor_awards to service_role;
