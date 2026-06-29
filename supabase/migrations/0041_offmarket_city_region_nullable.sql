-- 0041_offmarket_city_region_nullable.sql
-- Seeded ICIWorld "haves & wants" posts have no separate city field — the
-- location lives inside the free-form title. So city_region must be nullable
-- too (0040 relaxed the other required fields but missed this one). The native
-- posting form still requires it at the app layer, so realtor-created listings
-- are unchanged. The existing length>0 CHECK still applies when a value is given.
alter table public.off_market_listings alter column city_region drop not null;
