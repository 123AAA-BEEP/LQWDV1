-- 0057: recruit_targets — the agent outreach list (top-producer export).
-- Admin-only PII: names, business emails, brokerage + production stats used
-- to segment and personalize CASL-compliant invite batches. Never exposed to
-- realtors or the public; the eblast machinery reads it server-side.

create table if not exists recruit_targets (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  brokerage text,
  base_city text,
  region text not null default 'ontario',
  units_last_period numeric,
  volume_last_period numeric,
  source text, -- sheet / sub-market tag from the import
  status text not null default 'pending'
    check (status in ('pending','invited','followup_1','followup_2','parked','signed_up','suppressed')),
  invited_at timestamptz,
  last_emailed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- Plain column index (emails are lowercased on write) — PostgREST onConflict
-- can't infer expression indexes, and the importer upserts on this.
create unique index if not exists recruit_targets_email_key
  on recruit_targets (email);
create index if not exists recruit_targets_status_idx
  on recruit_targets (status);
create index if not exists recruit_targets_city_idx
  on recruit_targets (base_city);

alter table recruit_targets enable row level security;

-- Admins only (server actions use assertAdmin; service role bypasses RLS).
create policy "recruit_targets_admin_select" on recruit_targets
  for select using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
create policy "recruit_targets_admin_write" on recruit_targets
  for all using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

grant all on recruit_targets to authenticated;
grant all on recruit_targets to service_role;
