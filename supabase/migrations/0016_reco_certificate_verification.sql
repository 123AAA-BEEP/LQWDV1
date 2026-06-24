-- =============================================================================
-- 0016_reco_certificate_verification.sql — instant RECO verification + expiry.
--
-- Realtors can instant-verify by uploading their RECO registration certificate.
-- The app parses it (AI, server-side) and, on a confident match, auto-approves —
-- the source file is never stored (verify-and-purge). We persist only:
--   - profiles.reco_expiry / reco_verified_at / reco_verification_method, and
--   - a reco_verification_audits row (extracted vs profile values) for admin
--     spot-checks. No document, no images retained.
--
-- The in-app expiry banner reads profiles.reco_expiry. Idempotent. After 0015.
-- =============================================================================

alter table public.profiles
  add column if not exists reco_expiry date,
  add column if not exists reco_verified_at timestamptz,
  add column if not exists reco_verification_method text
    check (reco_verification_method in ('certificate', 'manual'));

-- Audit trail of certificate auto-verification decisions (admin-readable).
create table if not exists public.reco_verification_audits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  method text not null default 'certificate',
  matched boolean not null,
  extracted_name text,
  extracted_reco_number text,
  extracted_status text,
  extracted_expiry date,
  profile_name text,
  profile_reco text,
  created_at timestamptz not null default now()
);

alter table public.reco_verification_audits enable row level security;

-- Admins read; writes happen via the service role (bypasses RLS), so no
-- insert/update policy is granted to ordinary users.
drop policy if exists reco_audits_admin_read on public.reco_verification_audits;
create policy reco_audits_admin_read on public.reco_verification_audits
  for select to authenticated using (public.is_admin());

grant select on public.reco_verification_audits to authenticated;

create index if not exists reco_audits_profile_idx
  on public.reco_verification_audits (profile_id, created_at desc);
