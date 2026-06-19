-- =============================================================================
-- 0017_rfp_reveal_identity.sql — make the developer discretion story real.
--
-- Offers (deal_rfps) are already anonymous to agents: deal_rfps_realtor_view
-- exposes no developer identity. This adds an explicit OPT-IN so a developer
-- can choose to reveal their name + company on a given offer (e.g. a recognized
-- builder who wants the credibility). Default stays anonymous — discreet first.
--
-- The realtor view gains reveal_identity + developer_name + developer_company,
-- surfaced only when reveal_identity is true. Appended to the end of the view's
-- column list so CREATE OR REPLACE is valid. Run after 0016.
-- =============================================================================

alter table public.deal_rfps
  add column if not exists reveal_identity boolean not null default false;

create or replace view public.deal_rfps_realtor_view as
select
  r.id                 as id,
  r.title              as title,
  r.rfp_type           as rfp_type,
  r.deal_side          as deal_side,
  r.status             as status,
  r.visibility         as visibility,
  r.project_id         as project_id,
  r.hidden_fields      as hidden_fields,
  r.created_at         as created_at,
  r.updated_at         as updated_at,
  case when 'brief'        = any(r.hidden_fields) then null else r.brief        end as brief,
  case when 'target_units' = any(r.hidden_fields) then null else r.target_units end as target_units,
  case when 'target_price' = any(r.hidden_fields) then null else r.target_price end as target_price,
  case when 'deadline'     = any(r.hidden_fields) then null else r.deadline_at  end as deadline_at,
  -- Identity is shown only when the developer opts in.
  r.reveal_identity    as reveal_identity,
  case when r.reveal_identity
       then coalesce(
              nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''),
              p.display_name
            )
       else null end   as developer_name,
  case when r.reveal_identity then p.brokerage_name else null end as developer_company
from public.deal_rfps r
join public.profiles p on p.id = r.created_by_user_id
where r.status <> 'draft'
  and (
    public.is_admin()
    or r.created_by_user_id = auth.uid()
    or (
      public.is_ultra()
      and (r.visibility = 'all_ultra' or public.is_invited_to_rfp(r.id))
    )
  );

grant select on public.deal_rfps_realtor_view to authenticated;
