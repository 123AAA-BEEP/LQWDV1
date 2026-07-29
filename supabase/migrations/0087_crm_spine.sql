-- =============================================================================
-- LIQWD — Migration 0087: CRM spine (agent-owned clients, interests, tasks,
-- activity log)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   The single-player retention wedge: agent-owned contact records with CASL
--   consent fields (consent_email + attestation timestamp — the newsletter
--   blast in 0088 sends ONLY to consented contacts), client→project interest
--   links, follow-up tasks with due dates, and a logged activity trail
--   (call/email/text/meeting/note). Worksheet objects arrive with the
--   livestream-launch build and will hang off crm_contacts.
--
--   RLS: every table is owner-scoped (agent_profile_id = auth.uid()) with
--   admin override. Child tables denormalize agent_profile_id so policies
--   never need subselects.
--
-- EXECUTION ORDER
--   Run after 0086_consumer_guide_articles.sql.
-- =============================================================================

create table if not exists public.crm_contacts (
  id                    uuid primary key default gen_random_uuid(),
  agent_profile_id      uuid not null references public.profiles (id) on delete cascade,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  name                  text not null,
  email                 text,
  phone                 text,
  contact_kind          text,
  notes                 text,
  consent_email         boolean not null default false,
  consent_attested_at   timestamptz,
  unsubscribed_at       timestamptz,
  source_lead_id        uuid,
  archived              boolean not null default false,
  constraint crm_contacts_kind_chk
    check (contact_kind is null or contact_kind in ('buyer', 'investor', 'seller', 'renter', 'past_client', 'other'))
);
create index if not exists idx_crm_contacts_agent
  on public.crm_contacts (agent_profile_id, archived, updated_at desc);
create unique index if not exists uq_crm_contacts_agent_email
  on public.crm_contacts (agent_profile_id, lower(email)) where email is not null;

create table if not exists public.crm_contact_interests (
  id                    uuid primary key default gen_random_uuid(),
  agent_profile_id      uuid not null references public.profiles (id) on delete cascade,
  contact_id            uuid not null references public.crm_contacts (id) on delete cascade,
  project_id            uuid not null,
  status                text not null default 'interested',
  note                  text,
  created_at            timestamptz not null default now(),
  constraint crm_interest_status_chk
    check (status in ('interested', 'sent_info', 'hot', 'closed'))
);
create index if not exists idx_crm_interests_contact
  on public.crm_contact_interests (contact_id);

create table if not exists public.crm_tasks (
  id                    uuid primary key default gen_random_uuid(),
  agent_profile_id      uuid not null references public.profiles (id) on delete cascade,
  contact_id            uuid references public.crm_contacts (id) on delete cascade,
  title                 text not null,
  due_on                date,
  done_at               timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists idx_crm_tasks_agent_due
  on public.crm_tasks (agent_profile_id, done_at, due_on);

create table if not exists public.crm_activities (
  id                    uuid primary key default gen_random_uuid(),
  agent_profile_id      uuid not null references public.profiles (id) on delete cascade,
  contact_id            uuid not null references public.crm_contacts (id) on delete cascade,
  kind                  text not null,
  outcome               text,
  created_at            timestamptz not null default now(),
  constraint crm_activity_kind_chk
    check (kind in ('call', 'email', 'text', 'meeting', 'note'))
);
create index if not exists idx_crm_activities_contact
  on public.crm_activities (contact_id, created_at desc);

alter table public.crm_contacts enable row level security;
alter table public.crm_contact_interests enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_activities enable row level security;

drop policy if exists crm_contacts_own on public.crm_contacts;
create policy crm_contacts_own on public.crm_contacts
  for all to authenticated
  using (agent_profile_id = (select auth.uid()) or public.is_admin())
  with check (agent_profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists crm_interests_own on public.crm_contact_interests;
create policy crm_interests_own on public.crm_contact_interests
  for all to authenticated
  using (agent_profile_id = (select auth.uid()) or public.is_admin())
  with check (agent_profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists crm_tasks_own on public.crm_tasks;
create policy crm_tasks_own on public.crm_tasks
  for all to authenticated
  using (agent_profile_id = (select auth.uid()) or public.is_admin())
  with check (agent_profile_id = (select auth.uid()) or public.is_admin());

drop policy if exists crm_activities_own on public.crm_activities;
create policy crm_activities_own on public.crm_activities
  for all to authenticated
  using (agent_profile_id = (select auth.uid()) or public.is_admin())
  with check (agent_profile_id = (select auth.uid()) or public.is_admin());

grant select, insert, update, delete on public.crm_contacts to authenticated;
grant select, insert, update, delete on public.crm_contact_interests to authenticated;
grant select, insert, update, delete on public.crm_tasks to authenticated;
grant select, insert, update, delete on public.crm_activities to authenticated;
