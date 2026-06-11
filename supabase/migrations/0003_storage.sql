-- =============================================================================
-- LIQWD — Migration 0003: Storage Buckets & Storage RLS Policies
-- -----------------------------------------------------------------------------
-- WHAT THIS DOES
--   Creates four storage buckets and the storage.objects RLS policies that
--   govern them:
--     avatars            (public read; user manages own /{uid}/ folder)
--     logos              (public read; user manages own /{uid}/ folder)
--     project-media      (public read; admin-only write)
--     project-documents  (private; admin/approved-realtor read, grant-scoped
--                         developer read of their OWN uploads)
--
-- PATH CONVENTIONS (required by the policies below)
--     avatars/{user_id}/<file>
--     logos/{user_id}/<file>
--     project-media/{project_id}/<file>        (admin-managed)
--     project-documents/{project_id}/<file>    (restricted; first folder = project uuid)
--
-- EXECUTION ORDER
--   1) 0001_structural.sql
--   2) 0002_rls_policies.sql
--   3) 0003_storage.sql        <-- this file (run THIRD)
--   4) seed.sql                 (optional)
--
-- PREREQUISITES
--   0002 must have been run: the storage doc policies call the helper
--   functions public.is_admin(), public.is_approved(), public.has_project_access()
--   and public.safe_uuid() defined there.
--
-- SAFE TO RE-RUN?
--   Yes. Bucket inserts use ON CONFLICT DO NOTHING; policies are dropped
--   (IF EXISTS) before recreation. RLS on storage.objects is already enabled
--   by Supabase.
-- =============================================================================

-- 1. Buckets ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880,
     array['image/png','image/jpeg','image/webp']),
  ('logos', 'logos', true, 5242880,
     array['image/png','image/jpeg','image/webp','image/svg+xml']),
  ('project-media', 'project-media', true, 15728640,
     array['image/png','image/jpeg','image/webp']),
  ('project-documents', 'project-documents', false, 26214400,
     array['application/pdf',
           'application/msword',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
           'application/vnd.ms-excel',
           'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- 2. avatars  (public read; user manages own /{uid}/ folder) ------------------
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 3. logos  (public read; user manages own /{uid}/ folder) --------------------
drop policy if exists logos_public_read on storage.objects;
create policy logos_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'logos');

drop policy if exists logos_owner_write on storage.objects;
create policy logos_owner_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists logos_owner_update on storage.objects;
create policy logos_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists logos_owner_delete on storage.objects;
create policy logos_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- 4. project-media  (public read; admin-only write) ---------------------------
drop policy if exists project_media_public_read on storage.objects;
create policy project_media_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'project-media');

drop policy if exists project_media_admin_write on storage.objects;
create policy project_media_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'project-media' and public.is_admin())
  with check (bucket_id = 'project-media' and public.is_admin());

-- 5. project-documents  (private; restricted access) --------------------------
--   Read: admin, OR approved realtor, OR developer with a developer_restricted
--         grant for the project AND who owns the uploaded object.
drop policy if exists project_docs_read on storage.objects;
create policy project_docs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-documents'
    and (
      public.is_admin()
      or public.is_approved()
      or (
        owner = auth.uid()
        and public.has_project_access(
              public.safe_uuid((storage.foldername(name))[1]),
              'developer_restricted')
      )
    )
  );

--   Write (insert): admin/approved realtors anywhere; granted developers into
--   their own project folder (object owner is set to auth.uid() automatically).
drop policy if exists project_docs_insert on storage.objects;
create policy project_docs_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-documents'
    and (
      public.is_admin()
      or public.is_approved()
      or public.has_project_access(
           public.safe_uuid((storage.foldername(name))[1]),
           'developer_restricted')
    )
  );

--   Update/Delete: admin, or the object owner.
drop policy if exists project_docs_modify on storage.objects;
create policy project_docs_modify on storage.objects
  for update to authenticated
  using (bucket_id = 'project-documents' and (public.is_admin() or owner = auth.uid()))
  with check (bucket_id = 'project-documents' and (public.is_admin() or owner = auth.uid()));

drop policy if exists project_docs_delete on storage.objects;
create policy project_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-documents' and (public.is_admin() or owner = auth.uid()));

-- =============================================================================
-- End of migration 0003.
-- =============================================================================
