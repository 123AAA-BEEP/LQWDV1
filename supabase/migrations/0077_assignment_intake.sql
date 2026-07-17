-- =============================================================================
-- LIQWD — Migration 0077: assignment-desk intake (cold-outreach landing form)
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Supply-side seeding for the Assignment Desk: cold-outreached realtors who
--   already market off-market/assignment inventory land on
--   /agents/assignment-desk and drop their contact + listing basics WITHOUT a
--   signup wall. Rows land here for ops follow-up; the actual listing only
--   ever exists on the gated board (assignment_listings, 0072) after the
--   agent signs up and passes RECO verification — the "gated, never public"
--   invariant from docs/assignment-desk-spec.md is untouched because intake
--   rows are admin-only and never rendered anywhere public.
--
-- EXECUTION ORDER
--   Run after 0076_agent_reviews.sql.
-- =============================================================================

create table if not exists public.assignment_intake (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text,
  brokerage      text,
  project_name   text,
  city_region    text,
  assignment_price numeric(15, 2) check (assignment_price is null or assignment_price >= 0),
  notes          text,
  source         text,
  status         text not null default 'new',
  created_at     timestamptz not null default now(),
  constraint assignment_intake_status_chk
    check (status in ('new', 'contacted', 'onboarded', 'dismissed'))
);

create index if not exists idx_assignment_intake_status
  on public.assignment_intake (status);

alter table public.assignment_intake enable row level security;

-- Public landing form: insert only, always lands 'new'.
drop policy if exists assignment_intake_insert on public.assignment_intake;
create policy assignment_intake_insert on public.assignment_intake
  for insert to anon, authenticated
  with check (status = 'new');

-- Everything else is admin-only.
drop policy if exists assignment_intake_admin on public.assignment_intake;
create policy assignment_intake_admin on public.assignment_intake
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant insert on public.assignment_intake to anon, authenticated;
grant select, update, delete on public.assignment_intake to authenticated;
