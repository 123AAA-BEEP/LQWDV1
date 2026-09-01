-- =============================================================================
-- LIQWD — Migration 0100: Playbook System — approval queue, change sets, ledger
-- (migrations-spec 0002, founder-approved 2026-09-01)
-- -----------------------------------------------------------------------------
-- One staged-draft queue for every suite. Invariants live in the DATABASE:
--   - block-severity lint failure => can never be approved OR published
--   - published requires a prior human approval
--   - approved requires a plain-language summary (+ claims manifest where
--     the item type makes factual claims)
--   - the change ledger is append-only (grants AND trigger)
-- =============================================================================

create table if not exists public.approval_items (
  id uuid primary key default gen_random_uuid(),
  playbook text not null,
  run_id uuid not null default gen_random_uuid(),
  item_type text not null check (item_type in
    ('page_draft', 'content_draft', 'change_set', 'outreach_draft', 'gbp_draft', 'ad_draft')),
  subject_kind text not null check (subject_kind in
    ('project', 'realtor', 'property', 'campaign', 'location')),
  subject_id text not null,
  payload jsonb not null,
  plain_summary text not null check (length(trim(plain_summary)) > 0),
  claims_manifest jsonb not null default '[]'::jsonb,
  lint_results jsonb not null default '[]'::jsonb,
  triage jsonb,
  status text not null default 'staged' check (status in
    ('staged', 'triaged', 'approved', 'rejected', 'published', 'discarded')),
  approver_profile_id uuid references public.profiles(id),
  decided_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists approval_items_status_idx
  on public.approval_items(status, created_at desc);
create index if not exists approval_items_subject_idx
  on public.approval_items(subject_kind, subject_id);

-- The invariants, at the database layer (service code enforces them first;
-- this makes bypass impossible, not just discouraged).
create or replace function public.approval_items_guard()
returns trigger language plpgsql as $$
declare
  has_block boolean;
begin
  if new.status in ('approved', 'published') then
    select exists (
      select 1 from jsonb_array_elements(coalesce(new.lint_results, '[]'::jsonb)) r
      where r->>'severity' = 'block' and coalesce((r->>'pass')::boolean, false) = false
    ) into has_block;
    if has_block then
      raise exception 'approval_items: block-severity lint failure — cannot % (compliance beats approval)', new.status;
    end if;
  end if;
  if new.status = 'approved' then
    if new.approver_profile_id is null then
      raise exception 'approval_items: approved requires approver_profile_id';
    end if;
    new.decided_at := coalesce(new.decided_at, now());
    if new.item_type in ('page_draft', 'content_draft', 'outreach_draft', 'gbp_draft', 'ad_draft')
       and jsonb_array_length(coalesce(new.claims_manifest, '[]'::jsonb)) = 0 then
      raise exception 'approval_items: claim-bearing item approved without a claims manifest';
    end if;
  end if;
  if new.status = 'published' then
    -- publish cannot skip the human: the row must already carry an approval.
    if old.status is distinct from 'approved' and old.status is distinct from 'published' then
      raise exception 'approval_items: published requires a prior approved transition (was %)', old.status;
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end $$;

drop trigger if exists approval_items_guard_trg on public.approval_items;
create trigger approval_items_guard_trg
  before insert or update on public.approval_items
  for each row execute function public.approval_items_guard();

alter table public.approval_items enable row level security;
create policy approval_items_admin_all on public.approval_items
  for all using (public.is_admin()) with check (public.is_admin());
-- Realtors see their own staged items (decisions flow through server actions).
create policy approval_items_owner_read on public.approval_items
  for select using (subject_kind = 'realtor' and subject_id = auth.uid()::text);

-- ---- Change ledger (append-only, enforced twice) ----------------------------
create table if not exists public.change_ledger (
  id bigint generated always as identity primary key,
  approval_item_id uuid references public.approval_items(id),
  platform text not null,
  account_ref text,
  entity text not null,
  action text not null,
  before jsonb,
  after jsonb,
  actor text not null,
  reason text,
  rollback_info jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.change_ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'change_ledger is append-only';
end $$;

drop trigger if exists change_ledger_immutable_trg on public.change_ledger;
create trigger change_ledger_immutable_trg
  before update or delete on public.change_ledger
  for each row execute function public.change_ledger_immutable();

revoke update, delete on public.change_ledger from authenticated, anon;

alter table public.change_ledger enable row level security;
create policy change_ledger_admin_read on public.change_ledger
  for select using (public.is_admin());
create policy change_ledger_admin_insert on public.change_ledger
  for insert with check (public.is_admin());

-- ---- Spend safety (data; enforcement service ships with the Smart Ads suite)
create table if not exists public.spend_caps (
  id uuid primary key default gen_random_uuid(),
  account_ref text not null,
  cap_kind text not null,
  cap_limit numeric not null,
  cap_window text not null default 'daily',
  created_at timestamptz not null default now(),
  unique (account_ref, cap_kind, cap_window)
);
create table if not exists public.cooldowns (
  id uuid primary key default gen_random_uuid(),
  entity_ref text not null,
  until timestamptz not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.spend_caps enable row level security;
alter table public.cooldowns enable row level security;
create policy spend_caps_admin_all on public.spend_caps
  for all using (public.is_admin()) with check (public.is_admin());
create policy cooldowns_admin_all on public.cooldowns
  for all using (public.is_admin()) with check (public.is_admin());
