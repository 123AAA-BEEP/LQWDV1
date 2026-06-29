-- 0039_claimable_listings.sql
-- Makes off_market_listings support SEEDED, unclaimed listings (e.g. imported
-- from ICIWorld) that a source agent can later "claim" by signing up + verifying
-- with the listing's contact email. Native realtor posts are unaffected
-- (source defaults to 'realtor', realtor_id still set by the form).
--
-- Also adds a tiny admin-only scratch table the Vercel importer writes fetched
-- HTML into, so the parser can be developed against the real page structure.

-- Seeded rows have no owner yet, and some imported contacts may lack a phone or
-- email — relax those NOT NULLs (the native form still requires them at the app
-- layer, so the product contract is unchanged).
alter table public.off_market_listings alter column realtor_id drop not null;
alter table public.off_market_listings alter column contact_phone drop not null;
alter table public.off_market_listings alter column contact_email drop not null;

alter table public.off_market_listings
  add column if not exists source text not null default 'realtor',
  add column if not exists source_ref text,            -- e.g. ICIWorld listing id
  add column if not exists claim_email text,            -- source agent's email
  add column if not exists claimed_by_profile_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists claimed_at timestamptz;

comment on column public.off_market_listings.source is
  'Origin: realtor (native post) | iciworld (seeded import).';
comment on column public.off_market_listings.source_ref is
  'Stable source id (ICIWorld listing #) — unique per source for idempotent re-import.';
comment on column public.off_market_listings.claim_email is
  'Source agent email; an unclaimed listing auto-attaches to their profile when they verify with this email.';

-- Idempotent re-import: a given source listing exists at most once.
create unique index if not exists off_market_source_ref_uniq
  on public.off_market_listings (source, source_ref)
  where source_ref is not null;

-- Helps the claim-on-verify lookup (match unclaimed rows by email).
create index if not exists off_market_claim_email_idx
  on public.off_market_listings (lower(claim_email))
  where claimed_by_profile_id is null;

-- RLS is unchanged and already correct: approved realtors SELECT all rows
-- (incl. unclaimed, so the board shows them); INSERT/UPDATE/DELETE remain gated
-- to realtor_id = auth.uid(), so unclaimed rows (null owner) are writable only by
-- the service role (the importer) until claimed. Claiming sets realtor_id, after
-- which the new owner can edit normally.

-- Admin-only scratch table for the importer to stash fetched HTML into.
create table if not exists public.iciworld_raw (
  id uuid primary key default gen_random_uuid(),
  url text,
  http_status integer,
  content_type text,
  body text,
  note text,
  created_at timestamptz not null default now()
);
alter table public.iciworld_raw enable row level security;
drop policy if exists iciworld_raw_admin on public.iciworld_raw;
create policy iciworld_raw_admin on public.iciworld_raw
  for all using (public.is_admin()) with check (public.is_admin());
