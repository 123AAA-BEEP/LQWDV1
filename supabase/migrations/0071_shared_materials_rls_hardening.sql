-- 0071: harden the realtor-shared project materials introduced in 0070.
--
-- Security review found the buyer-exposure invariant was enforced only in the
-- server action, not in RLS: 0070's insert policy checked WHO inserts but not
-- WHAT, so an approved account hitting PostgREST directly could register a
-- realtor_share row whose file_url pointed at ANY private-bucket object (an
-- admin Altus price sheet, another broker's document) and the buyer page's
-- service-role signing would serve it publicly — a provenance leak
-- (CLAUDE.md: "Never expose provenance"). Also: is_approved() is role-agnostic
-- (an approved developer qualified), and the delete policy let a realtor delete
-- admin-curated 'upload' rows attributed to them.
--
-- This makes the leak unrepresentable at the DB layer and gives buyers a
-- single dedicated read surface.

-- 1) INSERT: pin every buyer-exposure column and the file path to the
--    uploader's own broker folder. A realtor can only ever register a file
--    they uploaded into their own folder, flagged realtor_share + not public
--    + rights-confirmed. No crafted insert can point at someone else's path.
drop policy if exists documents_realtor_insert on public.project_documents;
create policy documents_realtor_share_insert on public.project_documents
  for insert to authenticated
  with check (
    public.is_approved()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'realtor'
    )
    and uploaded_by_user_id = auth.uid()
    and source_type = 'realtor_share'
    and is_public = false
    and rights_confirmed_at is not null
    and file_url like (project_id::text || '/broker-' || auth.uid()::text || '/%')
  );

-- 2) DELETE: only your OWN realtor_share rows. Removes the power to delete
--    admin-curated 'upload' documents that happen to carry a realtor's
--    uploaded_by_user_id (seed data does exactly this).
drop policy if exists documents_uploader_delete on public.project_documents;
create policy documents_realtor_share_delete on public.project_documents
  for delete to authenticated
  using (
    uploaded_by_user_id = auth.uid()
    and source_type = 'realtor_share'
  );

-- 3) The ONE buyer/manager read surface for shared materials. Every future
--    reader queries this view instead of re-deriving the gate; a row that
--    isn't realtor_share, isn't rights-confirmed, or whose path escaped the
--    broker folder simply is not in it.
create or replace view public.shared_project_materials as
select
  d.id,
  d.project_id,
  d.document_type,
  d.title,
  d.file_url,
  d.uploaded_by_user_id,
  d.created_at
from public.project_documents d
where d.source_type = 'realtor_share'
  and d.rights_confirmed_at is not null
  and d.file_url like (d.project_id::text || '/broker-%');

grant select on public.shared_project_materials to anon, authenticated;

-- 4) Redundant index: unique(profile_id, project_id) on agent_project_notes
--    (0069) already provides this btree.
drop index if exists public.agent_project_notes_owner_idx;
