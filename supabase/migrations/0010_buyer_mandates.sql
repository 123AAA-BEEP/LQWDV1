-- =============================================================================
-- 0010_buyer_mandates.sql — Buyer Mandate (Pro feature), Stage 1.
--
-- A broker (Pro realtor) submits a mandate describing a hard-to-match buyer so
-- matching inventory can surface. Stage 1 covers the broker + admin side:
--   - Realtors (approved + Pro) create mandates and see ONLY their own.
--   - Admins see all.
-- Stage 2 (separate) adds the developer marketplace view (gated by the chosen
-- monetization model) and document upload + automated parsing for verification.
--
-- Buyer financial detail is sensitive: base-table reads are restricted to the
-- submitting broker + admins. No developer access yet (Stage 2 ships the
-- privacy-safe definer view).
--
-- Idempotent. Run after 0009. Safe to re-run.
-- =============================================================================

-- 1. Helpers ------------------------------------------------------------------
create or replace function public.is_pro()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and plan = 'pro'
  );
$$;

create or replace function public.is_developer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'developer'
  );
$$;

grant execute on function public.is_pro()        to authenticated;
grant execute on function public.is_developer()  to authenticated;

-- 2. Table --------------------------------------------------------------------
create table if not exists public.buyer_mandates (
  id                    uuid primary key default gen_random_uuid(),
  submitted_by_user_id  uuid not null references public.profiles (id) on delete cascade,
  -- Broker's private reference for the buyer (may be PII — broker/admin only).
  buyer_label           text,
  status                text not null default 'active',
  -- Criteria
  location_areas        text,
  location_radius_km    numeric(6,1),
  price_min             numeric(14,2),
  price_max             numeric(14,2),
  financing_type        text,
  size_sqft_min         integer,
  size_sqft_max         integer,
  beds_min              numeric(3,1),
  baths_min             numeric(3,1),
  lot_notes             text,
  property_type         text,
  condition             text,
  timeline              text,
  must_haves            text,
  nice_to_haves         text,
  -- Verification (self-reported in Stage 1; doc-parsed in Stage 2)
  pre_approval_status   text not null default 'none',
  pre_approval_amount   numeric(14,2),
  lender                text,
  pre_approval_expiry   date,
  proof_of_funds        boolean not null default false,
  rep_agreement_signed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint buyer_mandates_status_chk
    check (status in ('draft', 'active', 'matched', 'closed')),
  constraint buyer_mandates_preapproval_chk
    check (pre_approval_status in ('none', 'pre_qualified', 'pre_approved')),
  constraint buyer_mandates_financing_chk
    check (financing_type is null or financing_type in ('cash', 'mortgage', 'mixed'))
);

create index if not exists idx_buyer_mandates_submitted_by
  on public.buyer_mandates (submitted_by_user_id);
create index if not exists idx_buyer_mandates_status
  on public.buyer_mandates (status);

drop trigger if exists trg_buyer_mandates_updated_at on public.buyer_mandates;
create trigger trg_buyer_mandates_updated_at
  before update on public.buyer_mandates
  for each row execute function public.set_updated_at();

-- 3. RLS ----------------------------------------------------------------------
alter table public.buyer_mandates enable row level security;

grant select, insert, update, delete on public.buyer_mandates to authenticated;

-- Read: the submitting broker, or an admin. (Developers get a privacy-safe
-- definer view in Stage 2 — never the base table.)
drop policy if exists buyer_mandates_select on public.buyer_mandates;
create policy buyer_mandates_select on public.buyer_mandates
  for select using (
    submitted_by_user_id = auth.uid() or public.is_admin()
  );

-- Create: approved Pro realtors, for themselves only.
drop policy if exists buyer_mandates_insert on public.buyer_mandates;
create policy buyer_mandates_insert on public.buyer_mandates
  for insert with check (
    submitted_by_user_id = auth.uid()
    and public.is_approved()
    and public.is_pro()
  );

-- Update / delete: own rows, or admin.
drop policy if exists buyer_mandates_update on public.buyer_mandates;
create policy buyer_mandates_update on public.buyer_mandates
  for update using (submitted_by_user_id = auth.uid() or public.is_admin())
  with check (submitted_by_user_id = auth.uid() or public.is_admin());

drop policy if exists buyer_mandates_delete on public.buyer_mandates;
create policy buyer_mandates_delete on public.buyer_mandates
  for delete using (submitted_by_user_id = auth.uid() or public.is_admin());
