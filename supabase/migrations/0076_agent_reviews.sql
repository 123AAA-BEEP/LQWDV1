-- =============================================================================
-- LIQWD — Migration 0076: agent reviews (Zillow-style client testimonials)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Client-submitted reviews for verified agents' public profiles
--   (/realtors/{slug}). The trust model mirrors Zillow's: anyone can submit
--   (one per email per agent), but NOTHING publishes until an admin approves
--   it in the moderation queue — reviews used in advertising must be genuine
--   (RECO/TRESA), so the human gate is the feature, not overhead.
--
--   - agent_reviews: submissions land as 'pending'; the insert policy's
--     WITH CHECK pins status so the public form can never self-publish.
--   - public_agent_reviews_view (definer, same pattern as
--     public_realtor_cards): approved reviews of currently-public agents
--     only, PII (reviewer email) excluded. If an agent hides their public
--     profile or loses approved status, their reviews vanish with them.
--   - Agents can read their own reviews (any status) — powers "your review
--     link" stats; writes stay admin-only beyond the initial insert.
--
-- EXECUTION ORDER
--   Run after 0075_public_plans_brochures_views.sql.
-- =============================================================================

create table if not exists public.agent_reviews (
  id                 uuid primary key default gen_random_uuid(),
  agent_profile_id   uuid not null references public.profiles (id) on delete cascade,
  reviewer_name      text not null,
  reviewer_email     text not null,
  rating             integer not null,
  body               text not null,
  worked_on          text,
  status             text not null default 'pending',
  moderated_at       timestamptz,
  created_at         timestamptz not null default now(),
  constraint agent_reviews_rating_chk check (rating between 1 and 5),
  constraint agent_reviews_status_chk check (status in ('pending', 'approved', 'rejected')),
  constraint agent_reviews_body_chk   check (char_length(body) between 20 and 2000)
);

-- One review per client email per agent — the cheapest honest-volume guard.
create unique index if not exists uq_agent_reviews_agent_email
  on public.agent_reviews (agent_profile_id, lower(reviewer_email));
create index if not exists idx_agent_reviews_agent_status
  on public.agent_reviews (agent_profile_id, status);
create index if not exists idx_agent_reviews_status
  on public.agent_reviews (status);

alter table public.agent_reviews enable row level security;

-- Public submit: always lands pending (WITH CHECK pins it).
drop policy if exists agent_reviews_insert on public.agent_reviews;
create policy agent_reviews_insert on public.agent_reviews
  for insert to anon, authenticated
  with check (status = 'pending');

-- Agents read their own; admins read all.
drop policy if exists agent_reviews_select on public.agent_reviews;
create policy agent_reviews_select on public.agent_reviews
  for select to authenticated
  using (public.is_admin() or agent_profile_id = auth.uid());

-- Moderation (update/delete) is admin-only.
drop policy if exists agent_reviews_admin_update on public.agent_reviews;
create policy agent_reviews_admin_update on public.agent_reviews
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists agent_reviews_admin_delete on public.agent_reviews;
create policy agent_reviews_admin_delete on public.agent_reviews
  for delete to authenticated using (public.is_admin());

grant insert on public.agent_reviews to anon, authenticated;
grant select, update, delete on public.agent_reviews to authenticated;

-- Public read: approved reviews of currently-public agents, no PII.
create or replace view public.public_agent_reviews_view as
select
  r.id,
  r.agent_profile_id,
  r.reviewer_name,
  r.rating,
  r.body,
  r.worked_on,
  r.created_at
from public.agent_reviews r
where r.status = 'approved'
  and exists (
    select 1 from public.public_realtor_cards c
    where c.profile_id = r.agent_profile_id
  );

grant select on public.public_agent_reviews_view to anon, authenticated;
