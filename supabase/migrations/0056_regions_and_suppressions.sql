-- Multi-region expansion (BC + Florida): per-regulator licence verification
-- and a global email suppression list (CASL/CAN-SPAM opt-outs are permanent
-- and apply across every campaign, not just off-market invites).

alter table public.profiles
  add column if not exists license_region text not null default 'ontario';

alter table public.verification_requests
  add column if not exists license_region text not null default 'ontario';

-- Global do-not-email list. Every outbound campaign checks it before sending;
-- the /unsubscribe endpoint and "remove" replies both land here.
create table if not exists public.email_suppressions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reason text,                       -- 'unsubscribe_link' | 'reply_remove' | 'manual' | 'bounce'
  source text,                       -- campaign/surface that triggered it
  created_at timestamptz not null default now()
);
create unique index if not exists email_suppressions_email_uniq
  on public.email_suppressions (lower(email));

alter table public.email_suppressions enable row level security;

drop policy if exists "email_suppressions admin all" on public.email_suppressions;
create policy "email_suppressions admin all" on public.email_suppressions
  for all using (public.is_admin()) with check (public.is_admin());

grant all on public.email_suppressions to authenticated;
grant all on public.email_suppressions to service_role;
