-- =============================================================================
-- LIQWD — Migration 0004: Developer Opportunities Marketplace
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Adds the developer-listed "secret deal" marketplace:
--     * opportunities          — a paying developer's deal (1+ properties/units)
--     * opportunity_units      — the individual properties/units in a deal
--     * opportunity_bids       — realtor bids that move commission / incentive /
--                                price up or down (the free-market layer)
--     * notifications          — per-user notification feed (realtor + developer)
--   Plus the two definer "market" views that the realtor side reads through.
--   Those views enforce the developer's per-field hiding (hidden_fields) at the
--   database layer, so anything a developer chooses to keep private (address,
--   price, commission, incentive, …) and all internal notes are never exposed
--   to the realtor marketplace — only to the owning developer and admins.
--
-- EXECUTION ORDER
--   1) 0001_structural.sql
--   2) 0002_rls_policies.sql
--   3) 0003_storage.sql
--   4) 0004_opportunities.sql   <-- this file
--   5) seed.sql                 (optional)
--
-- PREREQUISITES
--   0001 + 0002 must have run (profiles, helper fns, set_updated_at exist).
--
-- SAFE TO RE-RUN?
--   Yes. CREATE ... IF NOT EXISTS, CREATE OR REPLACE, guarded policy/trigger
--   recreation. Re-running will not drop data.
--
-- NOTES
--   - opportunities_market_view / opportunity_units_market_view are intentional
--     SECURITY DEFINER views (the controlled realtor-facing gateways that apply
--     field hiding). Supabase's linter will flag them — that is expected.
--   - Notifications are written server-side with the service-role key, so the
--     insert policy stays admin-only; service_role bypasses RLS.
-- =============================================================================

-- 1. opportunities ------------------------------------------------------------
create table if not exists public.opportunities (
  id                  uuid primary key default gen_random_uuid(),
  developer_id        uuid not null references public.profiles (id) on delete cascade,
  title               text not null,
  deal_type           text not null default 'single_property',
  summary             text,                       -- realtor-facing description
  city                text,
  province            text default 'Ontario',
  unit_count          integer,
  asking_price        numeric(12,2),
  price_basis         text not null default 'total',
  commission_percent  numeric(5,2),
  incentive_amount    numeric(12,2),
  incentive_notes     text,
  -- Per-field privacy: any key listed here is masked in the realtor market view.
  -- Recognized keys: address, city, price, commission, incentive, unit_count,
  -- developer.
  hidden_fields       text[] not null default '{}',
  address_full        text,                       -- sensitive; hideable
  internal_notes      text,                       -- never shown to realtors
  status              text not null default 'draft',
  admin_notes         text,                       -- admin moderation only
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz,
  constraint opportunities_deal_type_chk
    check (deal_type in ('single_property', 'units', 'portfolio')),
  constraint opportunities_price_basis_chk
    check (price_basis in ('total', 'per_unit')),
  constraint opportunities_status_chk
    check (status in ('draft', 'open', 'paused', 'closed', 'suspended'))
);
create index if not exists idx_opportunities_developer on public.opportunities (developer_id);
create index if not exists idx_opportunities_status    on public.opportunities (status);
create index if not exists idx_opportunities_city      on public.opportunities (city);

-- 2. opportunity_units --------------------------------------------------------
create table if not exists public.opportunity_units (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  label           text not null,                  -- e.g. "Unit 510", "Phase 1"
  unit_type       text,
  beds            numeric(3,1),
  baths           numeric(3,1),
  sqft            integer,
  asking_price    numeric(12,2),
  address_full    text,                           -- sensitive; hideable via parent
  internal_notes  text,                           -- never shown to realtors
  status          text not null default 'available',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint opportunity_units_status_chk
    check (status in ('available', 'pending', 'sold', 'withdrawn'))
);
create index if not exists idx_opportunity_units_opportunity on public.opportunity_units (opportunity_id);

-- 3. opportunity_bids ---------------------------------------------------------
create table if not exists public.opportunity_bids (
  id                    uuid primary key default gen_random_uuid(),
  opportunity_id        uuid not null references public.opportunities (id) on delete cascade,
  realtor_id            uuid not null references public.profiles (id) on delete cascade,
  -- The realtor's proposed terms — any subset may be set. NULL means "no change
  -- from the developer's listed terms".
  bid_commission_percent numeric(5,2),
  bid_incentive_amount   numeric(12,2),
  bid_price              numeric(12,2),
  message               text,
  status                text not null default 'open',
  developer_response    text,
  responded_by_user_id  uuid references public.profiles (id) on delete set null,
  responded_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint opportunity_bids_status_chk
    check (status in ('open', 'accepted', 'declined', 'countered', 'withdrawn'))
);
create index if not exists idx_opportunity_bids_opportunity on public.opportunity_bids (opportunity_id);
create index if not exists idx_opportunity_bids_realtor     on public.opportunity_bids (realtor_id);
create index if not exists idx_opportunity_bids_status      on public.opportunity_bids (status);

-- 4. notifications ------------------------------------------------------------
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  type           text not null,
  title          text not null,
  body           text,
  link_url       text,
  opportunity_id uuid references public.opportunities (id) on delete cascade,
  bid_id         uuid references public.opportunity_bids (id) on delete cascade,
  is_read        boolean not null default false,
  created_at     timestamptz not null default now(),
  read_at        timestamptz
);
create index if not exists idx_notifications_user    on public.notifications (user_id);
create index if not exists idx_notifications_unread  on public.notifications (user_id, is_read);
create index if not exists idx_notifications_created on public.notifications (created_at);

-- 5. updated_at triggers ------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array['opportunities', 'opportunity_units', 'opportunity_bids'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I;', t);
    execute format(
      'create trigger trg_set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end$$;

-- 6. Helper: is the current user the owning developer of an opportunity? -------
create or replace function public.is_opportunity_owner(p_opportunity_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.opportunities o
    where o.id = p_opportunity_id and o.developer_id = auth.uid()
  );
$$;
grant execute on function public.is_opportunity_owner(uuid) to anon, authenticated;

-- 7. Enable RLS + base grants -------------------------------------------------
alter table public.opportunities      enable row level security;
alter table public.opportunity_units  enable row level security;
alter table public.opportunity_bids   enable row level security;
alter table public.notifications      enable row level security;

grant select, insert, update, delete on public.opportunities     to authenticated;
grant select, insert, update, delete on public.opportunity_units to authenticated;
grant select, insert, update, delete on public.opportunity_bids  to authenticated;
grant select, insert, update, delete on public.notifications     to authenticated;

-- ============================ POLICIES =======================================

-- ---- opportunities (owner developer + admin see full rows) ------------------
drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select to authenticated
  using (public.is_admin() or developer_id = auth.uid());

drop policy if exists opportunities_insert on public.opportunities;
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (developer_id = auth.uid());

-- Owner may edit while not suspended; admin may always edit (moderation).
drop policy if exists opportunities_update on public.opportunities;
create policy opportunities_update on public.opportunities
  for update to authenticated
  using (public.is_admin() or (developer_id = auth.uid() and status <> 'suspended'))
  with check (public.is_admin() or developer_id = auth.uid());

drop policy if exists opportunities_delete on public.opportunities;
create policy opportunities_delete on public.opportunities
  for delete to authenticated
  using (public.is_admin() or (developer_id = auth.uid() and status = 'draft'));

-- ---- opportunity_units ------------------------------------------------------
drop policy if exists opportunity_units_select on public.opportunity_units;
create policy opportunity_units_select on public.opportunity_units
  for select to authenticated
  using (public.is_admin() or public.is_opportunity_owner(opportunity_id));

drop policy if exists opportunity_units_write on public.opportunity_units;
create policy opportunity_units_write on public.opportunity_units
  for all to authenticated
  using (public.is_admin() or public.is_opportunity_owner(opportunity_id))
  with check (public.is_admin() or public.is_opportunity_owner(opportunity_id));

-- ---- opportunity_bids -------------------------------------------------------
-- Visible to the bidding realtor, the owning developer, and admins.
drop policy if exists opportunity_bids_select on public.opportunity_bids;
create policy opportunity_bids_select on public.opportunity_bids
  for select to authenticated
  using (
    public.is_admin()
    or realtor_id = auth.uid()
    or public.is_opportunity_owner(opportunity_id)
  );

-- An approved realtor places a bid as themselves on an open opportunity.
drop policy if exists opportunity_bids_insert on public.opportunity_bids;
create policy opportunity_bids_insert on public.opportunity_bids
  for insert to authenticated
  with check (
    realtor_id = auth.uid()
    and public.is_approved()
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.status = 'open'
    )
  );

-- Realtor may update their own bid (e.g. withdraw); developer/admin may respond.
drop policy if exists opportunity_bids_update on public.opportunity_bids;
create policy opportunity_bids_update on public.opportunity_bids
  for update to authenticated
  using (
    public.is_admin()
    or realtor_id = auth.uid()
    or public.is_opportunity_owner(opportunity_id)
  )
  with check (
    public.is_admin()
    or realtor_id = auth.uid()
    or public.is_opportunity_owner(opportunity_id)
  );

drop policy if exists opportunity_bids_delete on public.opportunity_bids;
create policy opportunity_bids_delete on public.opportunity_bids
  for delete to authenticated using (public.is_admin());

-- ---- notifications (recipient reads + marks read; writes are server-side) ---
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or user_id = auth.uid());

-- Direct inserts are admin-only; the app writes notifications with service_role
-- (which bypasses RLS) so cross-user fan-out works without opening spam vectors.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated with check (public.is_admin());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated using (public.is_admin() or user_id = auth.uid());

-- ============================ MARKET VIEWS ===================================
-- The realtor marketplace reads ONLY through these definer views, which mask
-- every field the developer chose to hide and never expose internal notes.

create or replace view public.opportunities_market_view as
select
  o.id                                                              as id,
  o.title                                                           as title,
  o.deal_type                                                       as deal_type,
  o.summary                                                         as summary,
  o.status                                                          as status,
  o.province                                                        as province,
  o.price_basis                                                     as price_basis,
  o.hidden_fields                                                   as hidden_fields,
  o.published_at                                                    as published_at,
  o.created_at                                                      as created_at,
  case when 'city'       = any(o.hidden_fields) then null else o.city               end as city,
  case when 'unit_count' = any(o.hidden_fields) then null else o.unit_count          end as unit_count,
  case when 'price'      = any(o.hidden_fields) then null else o.asking_price        end as asking_price,
  case when 'commission' = any(o.hidden_fields) then null else o.commission_percent  end as commission_percent,
  case when 'incentive'  = any(o.hidden_fields) then null else o.incentive_amount    end as incentive_amount,
  case when 'incentive'  = any(o.hidden_fields) then null else o.incentive_notes     end as incentive_notes,
  case when 'address'    = any(o.hidden_fields) then null else o.address_full        end as address_full,
  case
    when 'developer' = any(o.hidden_fields) then null
    else nullif(trim(coalesce(d.first_name, '') || ' ' || coalesce(d.last_name, '')), '')
  end                                                               as developer_name,
  (
    select count(*) from public.opportunity_bids b where b.opportunity_id = o.id
  )                                                                 as bid_count
from public.opportunities o
join public.profiles d on d.id = o.developer_id
where o.status = 'open'
  and (public.is_admin() or public.is_approved() or o.developer_id = auth.uid());

create or replace view public.opportunity_units_market_view as
select
  u.id             as id,
  u.opportunity_id as opportunity_id,
  u.label          as label,
  u.unit_type      as unit_type,
  u.beds           as beds,
  u.baths          as baths,
  u.sqft           as sqft,
  u.status         as status,
  u.sort_order     as sort_order,
  case when 'price'   = any(o.hidden_fields) then null else u.asking_price end as asking_price,
  case when 'address' = any(o.hidden_fields) then null else u.address_full end as address_full
from public.opportunity_units u
join public.opportunities o on o.id = u.opportunity_id
where o.status = 'open'
  and (public.is_admin() or public.is_approved() or o.developer_id = auth.uid());

grant select on public.opportunities_market_view      to authenticated;
grant select on public.opportunity_units_market_view  to authenticated;

-- =============================================================================
-- End of migration 0004.
-- =============================================================================
