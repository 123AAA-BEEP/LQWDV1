-- 0042_offmarket_admin_write.sql
-- Let admins (the LIQWD owner) post, edit, and remove off-market listings,
-- not just approved realtors. Read access already included admins (0037).
-- Owners (realtor_id = auth.uid()) keep their existing rights; admins get a
-- superset for moderation + seeding their own posts.

-- INSERT: approved realtors OR admins, still must own the row they create.
drop policy if exists off_market_insert on public.off_market_listings;
create policy off_market_insert on public.off_market_listings
  for insert
  with check (
    (public.is_approved_realtor() or public.is_admin())
    and realtor_id = auth.uid()
  );

-- UPDATE: the owner, or any admin (moderation).
drop policy if exists off_market_update on public.off_market_listings;
create policy off_market_update on public.off_market_listings
  for update
  using (realtor_id = auth.uid() or public.is_admin())
  with check (realtor_id = auth.uid() or public.is_admin());

-- DELETE: the owner, or any admin (moderation).
drop policy if exists off_market_delete on public.off_market_listings;
create policy off_market_delete on public.off_market_listings
  for delete
  using (realtor_id = auth.uid() or public.is_admin());
