-- 0044_offmarket_claim_flow.sql
-- Sourced (non-native) listings must stay DARK until the listing agent claims
-- and publishes them. Adds a publish status + a per-listing claim token, and
-- tightens RLS so the network only ever sees live listings.

-- status: pending_claim (sourced placeholder, hidden) | published (live) | archived
-- Fail-closed default: a row is dark unless something explicitly publishes it.
alter table public.off_market_listings
  add column if not exists status text not null default 'pending_claim'
    check (status in ('pending_claim', 'published', 'archived')),
  add column if not exists claim_token uuid not null default gen_random_uuid();

-- Real, owned listings are live now: native realtor posts (realtor_id set) and
-- anything already claimed. Sourced placeholders (no owner) stay pending_claim.
update public.off_market_listings
  set status = 'published'
  where status = 'pending_claim'
    and (realtor_id is not null or claimed_by_profile_id is not null);

create index if not exists off_market_status_idx
  on public.off_market_listings (status);
create unique index if not exists off_market_claim_token_idx
  on public.off_market_listings (claim_token);

-- Realtors see only published listings (or their own); admins see everything.
-- This is what keeps the sourced placeholders invisible to the broker network.
drop policy if exists off_market_select on public.off_market_listings;
create policy off_market_select on public.off_market_listings
  for select
  using (
    public.is_admin()
    or (
      public.is_approved_realtor()
      and (status = 'published' or realtor_id = auth.uid())
    )
  );
