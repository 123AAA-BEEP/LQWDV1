-- =============================================================================
-- 0012_mandate_connect.sql — Buyer Mandate Stage 2b: the connect mechanic.
--
-- A developer requests an intro on a mandate; the submitting broker accepts or
-- declines; on acceptance, contact is exchanged (handled app-side). Access is
-- metered by the pricing-agnostic entitlement seam:
--   - profiles.developer_mandate_access (subscription → unlimited), OR
--   - profiles.mandate_connect_credits  (à la carte → one credit per request).
-- Both are admin/server (Stripe webhook) controlled and guard-protected.
--
-- Idempotent. Run after 0011.
-- =============================================================================

-- 1. À la carte credit balance + guard ----------------------------------------
alter table public.profiles
  add column if not exists mandate_connect_credits integer not null default 0;

create or replace function public.protect_profile_sensitive_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.verification_status is distinct from old.verification_status
     or new.realtor_tier is distinct from old.realtor_tier
     or new.plan is distinct from old.plan
     or new.developer_mandate_access is distinct from old.developer_mandate_access
     or new.mandate_connect_credits is distinct from old.mandate_connect_credits then
    raise exception 'Only admins or billing can change protected profile fields';
  end if;
  return new;
end;
$$;

-- 2. Connect requests ---------------------------------------------------------
create table if not exists public.mandate_connect_requests (
  id                  uuid primary key default gen_random_uuid(),
  mandate_id          uuid not null references public.buyer_mandates (id) on delete cascade,
  developer_user_id   uuid not null references public.profiles (id) on delete cascade,
  status              text not null default 'requested',
  message             text,
  created_at          timestamptz not null default now(),
  responded_at        timestamptz,
  constraint mandate_connect_status_chk
    check (status in ('requested', 'accepted', 'declined', 'withdrawn')),
  constraint mandate_connect_unique unique (mandate_id, developer_user_id)
);

create index if not exists idx_mandate_connect_mandate on public.mandate_connect_requests (mandate_id);
create index if not exists idx_mandate_connect_developer on public.mandate_connect_requests (developer_user_id);

-- Helper: does auth.uid() own the mandate behind this request?
create or replace function public.owns_mandate(p_mandate_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.buyer_mandates m
    where m.id = p_mandate_id and m.submitted_by_user_id = auth.uid()
  );
$$;
grant execute on function public.owns_mandate(uuid) to authenticated;

alter table public.mandate_connect_requests enable row level security;
grant select, insert, update on public.mandate_connect_requests to authenticated;

-- Read: the requesting developer, the broker who owns the mandate, or an admin.
drop policy if exists mandate_connect_select on public.mandate_connect_requests;
create policy mandate_connect_select on public.mandate_connect_requests
  for select using (
    developer_user_id = auth.uid()
    or public.is_admin()
    or public.owns_mandate(mandate_id)
  );

-- Create: a developer, for themselves. (Entitlement — subscription or a credit —
-- is enforced in the server action, which also decrements à la carte credits.)
drop policy if exists mandate_connect_insert on public.mandate_connect_requests;
create policy mandate_connect_insert on public.mandate_connect_requests
  for insert with check (
    developer_user_id = auth.uid() and public.is_developer()
  );

-- Update: the mandate's broker or an admin (accept/decline); the developer may
-- withdraw their own request.
drop policy if exists mandate_connect_update on public.mandate_connect_requests;
create policy mandate_connect_update on public.mandate_connect_requests
  for update using (
    public.is_admin()
    or public.owns_mandate(mandate_id)
    or developer_user_id = auth.uid()
  )
  with check (
    public.is_admin()
    or public.owns_mandate(mandate_id)
    or developer_user_id = auth.uid()
  );
