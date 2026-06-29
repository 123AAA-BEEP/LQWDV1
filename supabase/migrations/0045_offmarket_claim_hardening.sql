-- 0045_offmarket_claim_hardening.sql
-- Hardening from the claim-flow security review:
--  1) claim_token is single-use — nulled the moment a listing is claimed, so a
--     forwarded/leaked link can't keep resolving to a now-published listing.
--  2) CASL opt-out durability — refs an admin removes are tombstoned so a later
--     re-seed never resurrects an opted-out listing.

-- (1) Allow the token to be cleared on claim.
alter table public.off_market_listings
  alter column claim_token drop not null;

-- Keep tokens unique only among rows that still have one (many NULLs allowed).
drop index if exists off_market_claim_token_idx;
create unique index off_market_claim_token_idx
  on public.off_market_listings (claim_token)
  where claim_token is not null;

-- (2) Suppressed source refs: never re-seed these.
create table if not exists public.off_market_suppressed_refs (
  source text not null,
  source_ref text not null,
  reason text,
  created_at timestamptz not null default now(),
  primary key (source, source_ref)
);

alter table public.off_market_suppressed_refs enable row level security;

drop policy if exists off_market_suppressed_admin on public.off_market_suppressed_refs;
create policy off_market_suppressed_admin on public.off_market_suppressed_refs
  for all
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete
  on public.off_market_suppressed_refs to authenticated;
