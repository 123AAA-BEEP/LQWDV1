-- 0050_offmarket_owner_sees_own.sql
-- A claimed-but-unverified agent could not see their OWN held listing (the
-- select policy required is_approved_realtor even for own rows), so between
-- claiming and approval their listing was invisible to them — a trust gap in
-- the claim funnel. Let owners always read their own rows; the network gate
-- (approved + published) is unchanged for everything else.

drop policy if exists off_market_select on public.off_market_listings;
create policy off_market_select on public.off_market_listings
  for select
  using (
    public.is_admin()
    or realtor_id = auth.uid()
    or claimed_by_profile_id = auth.uid()
    or (public.is_approved_realtor() and status = 'published')
  );
