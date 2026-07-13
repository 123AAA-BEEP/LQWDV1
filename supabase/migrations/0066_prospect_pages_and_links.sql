-- 0066: pre-minted unclaimed agent pages + custom link-in-bio links.
--
-- Two features for the "your page is already live, claim it" outreach wave:
--
-- 1) prospect_pages — a page minted from a recruit_targets row BEFORE the
--    invite is sent, so liqwd.ca/realtors/{slug} resolves the moment the email
--    lands. Holds DIRECTORY-GRADE data only (name, brokerage, city — the same
--    professional info already public on any brokerage roster). Never the
--    email/phone/volume from the outreach list. The public page renders an
--    "unclaimed" treatment (no verified badge, a claim CTA) and is noindex.
--    On claim + RECO verification the SAME slug becomes the agent's real
--    profile slug, so the URL in the email is the URL they keep.
--
-- 2) realtor_links — a verified agent's own external links (their site, reviews,
--    YouTube, etc.), rendered as buttons on their public page. The link-in-bio
--    surface promised in the outreach copy. Mirrors realtor_awards exactly.

-- ---------------------------------------------------------------------------
-- 1) prospect_pages
-- ---------------------------------------------------------------------------
create table if not exists public.prospect_pages (
  id                    uuid primary key default gen_random_uuid(),
  recruit_target_id     uuid references public.recruit_targets (id) on delete set null,
  slug                  text not null unique,
  first_name            text,
  last_name             text,
  brokerage             text,
  city                  text,
  region                text not null default 'ontario',
  -- Set when an authenticated user claims the page (race-safe in the action).
  claimed_by_profile_id uuid references public.profiles (id) on delete set null,
  claimed_at            timestamptz,
  -- Soft takedown for a "reply remove" request — keeps the slug reserved so it
  -- can't be re-minted, but the page stops resolving.
  removed_at            timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists prospect_pages_slug_idx
  on public.prospect_pages (slug);
create index if not exists prospect_pages_target_idx
  on public.prospect_pages (recruit_target_id);
create index if not exists prospect_pages_claimed_idx
  on public.prospect_pages (claimed_by_profile_id);

alter table public.prospect_pages enable row level security;

-- Public read of live (unremoved) rows so the page renders for anon visitors.
-- Only directory-grade columns exist here, so anon read is safe. All WRITES are
-- service-role / server-action-with-admin-client only (minting + claim), so no
-- authenticated write policy is granted.
drop policy if exists "prospect_pages_public_read" on public.prospect_pages;
create policy "prospect_pages_public_read" on public.prospect_pages
  for select using (removed_at is null);

grant select on public.prospect_pages to anon, authenticated;
grant all on public.prospect_pages to service_role;

-- ---------------------------------------------------------------------------
-- 2) realtor_links  (mirrors realtor_awards from 0065)
-- ---------------------------------------------------------------------------
create table if not exists public.realtor_links (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label      text not null,
  url        text not null,
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  constraint realtor_links_label_len
    check (char_length(label) between 1 and 60),
  constraint realtor_links_url_len
    check (char_length(url) between 1 and 500)
);
create index if not exists realtor_links_profile_idx
  on public.realtor_links (profile_id, sort_order, created_at);

alter table public.realtor_links enable row level security;

drop policy if exists "realtor_links_public_read" on public.realtor_links;
create policy "realtor_links_public_read" on public.realtor_links
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id
        and p.is_public_profile_enabled = true
        and p.verification_status = 'approved'
    )
    or auth.uid() = profile_id
  );
drop policy if exists "realtor_links_owner_write" on public.realtor_links;
create policy "realtor_links_owner_write" on public.realtor_links
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant select on public.realtor_links to anon, authenticated;
grant all on public.realtor_links to authenticated;
grant all on public.realtor_links to service_role;
