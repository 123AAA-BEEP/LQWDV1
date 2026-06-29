-- 0046_property_submissions_project_id.sql
-- BUGFIX: the submissions admin page and approveSubmission() both read and
-- write property_submissions.project_id (the link to the canonical project a
-- submission becomes), but the column was never added. Every PostgREST query
-- that selected it errored and returned null, so the Submissions queue rendered
-- silently empty (while the Overview count, which doesn't select it, showed 1),
-- and approveSubmission selected it too — so approvals were a silent no-op.
--
-- Add the missing column the code already expects.

alter table public.property_submissions
  add column if not exists project_id uuid
    references public.projects(id) on delete set null;

create index if not exists property_submissions_project_id_idx
  on public.property_submissions (project_id);
