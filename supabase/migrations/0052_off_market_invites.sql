-- 0052_off_market_invites.sql
-- Staged claim-invite sender: one row per AGENT (an agent with 24 listings
-- gets ONE email listing all their claim links). Drafts are generated, the
-- admin approves (edits/skips), and approved rows are sent in throttled
-- batches. Nothing sends without explicit approval (CASL posture).

create table if not exists public.off_market_invites (
  id uuid primary key default gen_random_uuid(),
  claim_email text not null unique,
  agent_name text,
  brokerage_name text,
  phone text,
  listing_count int not null default 0,
  subject text not null,
  body_html text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'skipped', 'failed')),
  error text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  sent_at timestamptz
);

alter table public.off_market_invites enable row level security;

drop policy if exists off_market_invites_admin on public.off_market_invites;
create policy off_market_invites_admin on public.off_market_invites
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- RLS gates the rows; the role still needs base-table privileges.
grant select, insert, update, delete on public.off_market_invites to authenticated;
