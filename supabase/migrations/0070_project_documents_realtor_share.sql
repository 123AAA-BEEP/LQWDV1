-- 0070: project-level shared materials (rework of 0069's agent-scoped files).
--
-- Correction to the buyer-portal model: a floor plan is a fact about THE
-- PROJECT, not about the agent who uploaded it. Uploads land in the existing
-- project_documents table (project-scoped, already readable by every
-- approved realtor — the community asset), instead of the agent-private
-- table 0069 introduced (dropped below; it was empty).
--
--   - Approved realtors may INSERT their own uploads (uploaded_by = self)
--     and DELETE their own rows; admins keep full control (0002 policy).
--   - rights_confirmed_at audits the "I have the right to share this"
--     confirmation given at upload time.
--   - BUYER exposure is opt-in by construction: shortlist pages render ONLY
--     rows with source_type='realtor_share' AND rights_confirmed_at set.
--     Admin/provenance documents in this table never reach buyers.
--
-- agent_project_notes (0069) is unchanged: incentive/deposit/note text stays
-- agent-voiced, shown only on that agent's own shortlists.

alter table public.project_documents
  add column if not exists rights_confirmed_at timestamptz;

drop policy if exists documents_realtor_insert on public.project_documents;
create policy documents_realtor_insert on public.project_documents
  for insert to authenticated
  with check (public.is_approved() and uploaded_by_user_id = auth.uid());

drop policy if exists documents_uploader_delete on public.project_documents;
create policy documents_uploader_delete on public.project_documents
  for delete to authenticated
  using (uploaded_by_user_id = auth.uid());

grant select, insert, delete on public.project_documents to authenticated;

-- Superseded before it ever held a row.
drop table if exists public.agent_project_files;
