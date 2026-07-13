-- 0067: "Work with {agent}" contact requests + license_region on the card view.
--
-- 1) agent_contact_requests — the lead form on the public agent profile
--    (/realtors/{slug}). Distinct from project_leads on purpose: these are
--    agent-relationship inquiries with no project context, and keeping them
--    out of project_leads keeps project lead analytics clean.
--    Writes are SERVICE-ROLE ONLY (the server action inserts after validating
--    the target agent is public+approved); the owning agent reads their own.
--
-- 2) public_realtor_cards gains license_region (append-only, per the standing
--    rule in 0063/0065) so the verified-badge endpoint can name the actual
--    regulator (RECO / BCFSA / FL DBPR) instead of over-claiming RECO for
--    everyone — TRESA-safe wording depends on it.

create table if not exists public.agent_contact_requests (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text,
  message    text,
  status     text not null default 'new'
    check (status in ('new', 'contacted', 'closed', 'spam')),
  created_at timestamptz not null default now(),
  constraint agent_contact_name_len check (char_length(name) between 1 and 120),
  constraint agent_contact_email_len check (char_length(email) between 3 and 320),
  constraint agent_contact_msg_len check (message is null or char_length(message) <= 4000)
);
create index if not exists agent_contact_requests_profile_idx
  on public.agent_contact_requests (profile_id, created_at desc);

alter table public.agent_contact_requests enable row level security;

drop policy if exists "agent_contact_owner_read" on public.agent_contact_requests;
create policy "agent_contact_owner_read" on public.agent_contact_requests
  for select using (auth.uid() = profile_id);
drop policy if exists "agent_contact_owner_update" on public.agent_contact_requests;
create policy "agent_contact_owner_update" on public.agent_contact_requests
  for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

grant select, update on public.agent_contact_requests to authenticated;
grant all on public.agent_contact_requests to service_role;

-- Widen the public card view (append-only — original column order preserved).
create or replace view public.public_realtor_cards as
select
  p.id          as profile_id,
  p.first_name  as first_name,
  p.last_name   as last_name,
  p.title       as title,
  coalesce(b.brokerage_name, p.brokerage_name) as brokerage,
  p.email       as email,   -- optional public field
  p.phone       as phone,   -- optional public field
  p.slug        as slug,
  p.avatar_url  as avatar_url,
  p.bio_short   as bio_short,
  p.service_area as service_area,
  p.referral_code as referral_code,
  (p.plan in ('pro','ultra')
    or p.realtor_tier in ('pro','ultra')
    or (p.pro_until is not null and p.pro_until > now())) as is_pro,
  p.banner_url        as banner_url,
  p.show_achievements as show_achievements,
  p.reco_verified_at  as reco_verified_at,
  p.license_region    as license_region
from public.profiles p
left join public.brokerages b on b.id = p.brokerage_id
where p.is_public_profile_enabled = true
  and p.verification_status = 'approved';
