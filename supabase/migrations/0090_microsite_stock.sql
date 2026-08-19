-- =============================================================================
-- LIQWD — Migration 0090: Microsite stock image library
-- -----------------------------------------------------------------------------
-- Themed fallback photography for microsites whose projects have thin media:
-- when a section has no real rendering to show, the renderer pulls an
-- on-theme stock image (transit for "getting around", parks/coffee for
-- "nearby amenities", scenery or a brand colour for the hero, etc.).
-- Real project imagery ALWAYS wins; stock only fills gaps.
--
-- Bucket: stock-images (public read; admin-only write), path {theme}/<file>.
-- Table: microsite_stock_images (admin-only; the renderer reads via the
-- service role). `city` optionally scopes an image to a city so local shots
-- beat generic ones.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('stock-images', 'stock-images', true, 15728640,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists stock_images_public_read on storage.objects;
create policy stock_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'stock-images');

drop policy if exists stock_images_admin_write on storage.objects;
create policy stock_images_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'stock-images' and public.is_admin())
  with check (bucket_id = 'stock-images' and public.is_admin());

create table if not exists public.microsite_stock_images (
  id uuid primary key default gen_random_uuid(),
  theme text not null check (theme in
    ('hero','neighbourhood','transit','amenities','parks','homes','lifestyle','generic')),
  url text not null,
  alt_text text,
  city text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.microsite_stock_images enable row level security;

drop policy if exists stock_admin_all on public.microsite_stock_images;
create policy stock_admin_all on public.microsite_stock_images
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
