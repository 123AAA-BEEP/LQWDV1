-- 0037_off_market_listings.sql
-- Off-market listings — a broker-to-broker board on the realtor dashboard.
--
-- Any APPROVED realtor can post an off-market deal and browse every other
-- realtor's listings (with contact details) to connect. Only the owner can edit
-- or delete their own. The board is invisible to developers, admins, and the
-- public (gated at both RLS and the app layer).
--
-- Conventions vs. the generic spec this was built from:
--   * Enums are modelled as text + CHECK (like record_status / verification_status
--     elsewhere in this schema) rather than native CREATE TYPE enums — easier to
--     extend and matches database.types.ts shapes.
--   * realtor_id references public.profiles(id) (which IS auth.uid()) so we can
--     join realtor data; same value as auth.users(id).
--   * Reuses the shared set_updated_at() trigger fn and the is_approved()/
--     is_admin() helper style from migrations 0002/0004.

-- Helper: is the current user an APPROVED realtor (not a dev/admin)? ---------
-- SECURITY DEFINER so it can read profiles under RLS. Used by the table AND the
-- storage policies below.
create or replace function public.is_approved_realtor()
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'realtor'
      and verification_status = 'approved'
  );
$$;

-- Table -----------------------------------------------------------------------
create table if not exists public.off_market_listings (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid not null references public.profiles(id) on delete cascade,

  -- Core (required)
  title text not null check (length(btrim(title)) > 0),
  price numeric(15, 2) not null check (price >= 0),
  price_type text not null check (
    price_type in ('flat_price', 'price_per_sqft', 'price_per_acre', 'price_per_unit')
  ),
  listing_status text not null check (
    listing_status in ('for_sale', 'for_lease', 'for_sale_and_lease')
  ),
  -- Multi-select; every element must be a known property type and at least one.
  -- cardinality() (not array_length) so an EMPTY array is rejected: array_length
  -- of an empty array is NULL, and "NULL > 0" would let a CHECK pass.
  property_types text[] not null check (
    cardinality(property_types) > 0
    and property_types <@ array[
      'residential_resale', 'residential_assignment', 'commercial',
      'industrial', 'office', 'land', 'business'
    ]::text[]
  ),
  -- Required, free-text: as specific ("King City, ON") or broad ("GTA West").
  city_region text not null check (length(btrim(city_region)) > 0),

  -- Optional
  address text,                       -- may be withheld to keep a deal discreet
  property_type_description text,     -- free-text subcategory / extra detail
  size_value numeric(12, 2) check (size_value is null or size_value >= 0),
  size_type text check (size_type in ('square_footage', 'acreage', 'unit_count')),
  image_urls text[] not null default '{}',  -- public URLs in off-market-media

  -- Contact snapshot (captured from the poster's profile at write time, so a
  -- later profile edit doesn't silently change a live listing's contact info).
  realtor_name text not null,
  realtor_title text,
  brokerage_name text not null,
  contact_phone text not null,
  contact_email text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- size_value and size_type are all-or-nothing.
  constraint size_fields_consistent check (
    (size_value is null and size_type is null)
    or (size_value is not null and size_type is not null)
  )
);

comment on table public.off_market_listings is
  'Broker-to-broker off-market board. Any approved realtor reads all rows; only the owner writes. Hidden from developers/admins/public at the app layer.';

create index if not exists off_market_listings_created_idx
  on public.off_market_listings (created_at desc);
create index if not exists off_market_listings_realtor_idx
  on public.off_market_listings (realtor_id);

-- Auto-bump updated_at on every edit (shared trigger fn).
drop trigger if exists off_market_listings_set_updated_at on public.off_market_listings;
create trigger off_market_listings_set_updated_at
  before update on public.off_market_listings
  for each row execute function public.set_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.off_market_listings enable row level security;

-- SELECT: every approved realtor browses the whole board.
drop policy if exists off_market_select on public.off_market_listings;
create policy off_market_select on public.off_market_listings
  for select using (public.is_approved_realtor());

-- INSERT: an approved realtor may create only their own rows.
drop policy if exists off_market_insert on public.off_market_listings;
create policy off_market_insert on public.off_market_listings
  for insert with check (
    public.is_approved_realtor() and realtor_id = auth.uid()
  );

-- UPDATE: only the owner may edit.
drop policy if exists off_market_update on public.off_market_listings;
create policy off_market_update on public.off_market_listings
  for update using (realtor_id = auth.uid())
  with check (realtor_id = auth.uid());

-- DELETE: only the owner may delete.
drop policy if exists off_market_delete on public.off_market_listings;
create policy off_market_delete on public.off_market_listings
  for delete using (realtor_id = auth.uid());

-- APP-LAYER NOTE: /dashboard/off-market additionally gates on role='realtor' +
-- approved (isApproved() in src/lib/auth.ts) so the nav entry and pages are
-- hidden from developers and admins. Admins never read this table from the UI.

-- Storage: off-market listing photos ------------------------------------------
-- Public-read bucket (same shape as project-media) so photos render via a plain
-- public URL on the already-gated board; writes are locked to approved realtors
-- uploading under their own uid folder ("<auth.uid()>/<file>"). 15 MB, images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'off-market-media', 'off-market-media', true, 15728640,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- Read: public (matches avatars/logos/project-media convention).
drop policy if exists off_market_media_read on storage.objects;
create policy off_market_media_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'off-market-media');

-- Write: approved realtors, into their own uid folder only.
drop policy if exists off_market_media_insert on storage.objects;
create policy off_market_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'off-market-media'
    and public.is_approved_realtor()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists off_market_media_update on storage.objects;
create policy off_market_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'off-market-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists off_market_media_delete on storage.objects;
create policy off_market_media_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'off-market-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
