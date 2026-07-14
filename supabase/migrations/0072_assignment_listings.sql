-- 0072: assignment_listings — the pre-construction Assignment Desk.
--
-- Gated realtor-to-realtor board for assignments (a buyer's existing pre-con
-- contract being resold before closing). Mirrors off_market_listings' access
-- model exactly: every APPROVED realtor (and admins) reads the whole board;
-- only the owner writes. Developers and the public get no grant and no policy
-- path — never public, never indexed (see docs/assignment-desk-spec.md).
--
-- Compliance posture (load-bearing): LIQWD is a matchmaking board, never a
-- party to the assignment. builder_consent_status + rights_confirmed_at record
-- the poster's own attestation; commission/economics fields are reference data
-- only (LIQWD never calculates or takes a cut). Enums are text + CHECK, the
-- schema house style.

create table if not exists public.assignment_listings (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid not null references public.profiles(id) on delete cascade,

  -- Link to a tracked LIQWD project when it's one we have; nullable so an
  -- off-catalogue project still lists (project_name is the snapshot either way).
  project_id uuid references public.projects(id) on delete set null,
  project_name text not null check (length(btrim(project_name)) > 0),
  city_region text not null check (length(btrim(city_region)) > 0),

  -- The unit
  unit_label text,
  beds numeric(3, 1) check (beds is null or beds >= 0),
  baths numeric(3, 1) check (baths is null or baths >= 0),
  size_sqft integer check (size_sqft is null or size_sqft > 0),
  exposure text,
  parking integer check (parking is null or parking >= 0),
  locker boolean,

  -- Economics — agent-entered REFERENCE DATA. LIQWD is not a party.
  original_purchase_price numeric(15, 2) check (original_purchase_price is null or original_purchase_price >= 0),
  assignment_price        numeric(15, 2) not null check (assignment_price >= 0),
  deposit_paid_to_date    numeric(15, 2) check (deposit_paid_to_date is null or deposit_paid_to_date >= 0),
  co_op_commission_note   text,

  -- Timing
  occupancy_estimate     text,
  final_closing_estimate text,

  -- The load-bearing compliance field + attestation timestamp.
  builder_consent_status text not null default 'unknown' check (
    builder_consent_status in (
      'unknown', 'not_required', 'consent_pending',
      'consent_obtained', 'assignment_prohibited'
    )
  ),
  builder_assignment_fee numeric(15, 2) check (builder_assignment_fee is null or builder_assignment_fee >= 0),
  rights_confirmed_at timestamptz,        -- set when the poster attests

  notes text,
  image_urls text[] not null default '{}',  -- private bucket paths; signed at render

  -- Contact snapshot (captured at write time, like off_market_listings).
  realtor_name text not null,
  brokerage_name text not null,
  contact_phone text not null,
  contact_email text not null,

  status text not null default 'active' check (
    status in ('active', 'under_contract', 'assigned', 'withdrawn', 'expired')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assignment_listings is
  'Gated broker-to-broker pre-construction assignment board. Approved realtors read all; owner writes. Never public/developer-visible.';

create index if not exists assignment_listings_created_idx
  on public.assignment_listings (created_at desc);
create index if not exists assignment_listings_realtor_idx
  on public.assignment_listings (realtor_id);
create index if not exists assignment_listings_project_idx
  on public.assignment_listings (project_id);

drop trigger if exists assignment_listings_set_updated_at on public.assignment_listings;
create trigger assignment_listings_set_updated_at
  before update on public.assignment_listings
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.assignment_listings enable row level security;

-- SELECT: every approved realtor browses the board; admins too. No developer
-- or anon path exists.
drop policy if exists assignment_select on public.assignment_listings;
create policy assignment_select on public.assignment_listings
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'admin'
          or (p.role = 'realtor' and p.verification_status = 'approved')
        )
    )
  );

-- INSERT: owner only, and only an approved realtor.
drop policy if exists assignment_insert on public.assignment_listings;
create policy assignment_insert on public.assignment_listings
  for insert with check (
    realtor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'realtor'
        and p.verification_status = 'approved'
    )
  );

-- UPDATE / DELETE: owner only (admins moderate via service role if needed).
drop policy if exists assignment_update on public.assignment_listings;
create policy assignment_update on public.assignment_listings
  for update using (realtor_id = auth.uid()) with check (realtor_id = auth.uid());

drop policy if exists assignment_delete on public.assignment_listings;
create policy assignment_delete on public.assignment_listings
  for delete using (realtor_id = auth.uid());

grant select, insert, update, delete on public.assignment_listings to authenticated;
grant all on public.assignment_listings to service_role;
