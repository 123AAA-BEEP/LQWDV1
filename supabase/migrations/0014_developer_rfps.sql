-- =============================================================================
-- 0014_developer_rfps.sql — let developers author RFPs and review proposals.
--
-- Until now Deal Desk RFPs were admin-authored and only admins (+ the proposing
-- realtor) could read proposals. This lets a developer:
--   - create / update / delete their OWN deal_rfps (visibility is their choice:
--     'all_ultra' = open to all Ultra realtors, or 'invited' = restricted), and
--   - read + shortlist/award the proposals submitted to their own RFPs.
-- Admin write/oversight is unchanged; realtor read still flows through the
-- masked deal_rfps_realtor_view (0008).
--
-- Idempotent. Run after 0013.
-- =============================================================================

-- Helper: does auth.uid() own this RFP?
create or replace function public.owns_rfp(p_rfp_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.deal_rfps r
    where r.id = p_rfp_id and r.created_by_user_id = auth.uid()
  );
$$;
grant execute on function public.owns_rfp(uuid) to authenticated;

-- deal_rfps: developers author + manage their own (in addition to admin write
-- and the existing creator/eligible-ultra SELECT policy).
drop policy if exists rfps_developer_insert on public.deal_rfps;
create policy rfps_developer_insert on public.deal_rfps
  for insert to authenticated
  with check (created_by_user_id = auth.uid() and public.is_developer());

drop policy if exists rfps_developer_update on public.deal_rfps;
create policy rfps_developer_update on public.deal_rfps
  for update to authenticated
  using (created_by_user_id = auth.uid() and public.is_developer())
  with check (created_by_user_id = auth.uid() and public.is_developer());

drop policy if exists rfps_developer_delete on public.deal_rfps;
create policy rfps_developer_delete on public.deal_rfps
  for delete to authenticated
  using (created_by_user_id = auth.uid() and public.is_developer());

-- deal_rfp_proposals: the RFP owner can read + manage proposals on their RFP.
-- (Recreates the existing policies with the owner branch added.)
drop policy if exists rfp_proposals_select on public.deal_rfp_proposals;
create policy rfp_proposals_select on public.deal_rfp_proposals
  for select to authenticated
  using (
    public.is_admin()
    or submitted_by_user_id = auth.uid()
    or public.owns_rfp(rfp_id)
  );

drop policy if exists rfp_proposals_update on public.deal_rfp_proposals;
create policy rfp_proposals_update on public.deal_rfp_proposals
  for update to authenticated
  using (
    public.is_admin()
    or public.owns_rfp(rfp_id)
    or (submitted_by_user_id = auth.uid() and status = 'submitted')
  )
  with check (
    public.is_admin()
    or public.owns_rfp(rfp_id)
    or submitted_by_user_id = auth.uid()
  );
