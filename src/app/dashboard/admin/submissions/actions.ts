"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { slugify } from "@/lib/slug";
import { rewardSubmissionApproved } from "@/lib/rewards";

/**
 * Approves a submission: creates a DRAFT canonical project from the submitted
 * fields (admin enriches/publishes it later) and links it back to the
 * submission. Admin-only.
 */
export async function approveSubmission(formData: FormData) {
  const submissionId = String(formData.get("submission_id") ?? "");
  if (!submissionId) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  const { data: submission } = await supabase
    .from("property_submissions")
    .select(
      "id, project_name, builder_name, city, address_text, project_id, submitted_by_user_id",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!submission) return;

  let projectId = submission.project_id as string | null;

  // Create the canonical draft project only once.
  if (!projectId) {
    const { data: project } = await supabase
      .from("projects")
      .insert({
        slug: slugify(submission.project_name),
        project_name: submission.project_name,
        builder_name: submission.builder_name,
        city: submission.city ?? "Unknown",
        address_full: submission.address_text,
        record_status: "draft",
      })
      .select("id")
      .single();
    projectId = project?.id ?? null;
  }

  await supabase
    .from("property_submissions")
    .update({
      status: "approved",
      project_id: projectId,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  // Reward the contributor (Pro days + lead stewardship once the project has an
  // active public page). Idempotent per submission.
  await rewardSubmissionApproved(
    submission.submitted_by_user_id as string,
    submission.id as string,
    projectId,
  );

  revalidatePath("/dashboard/admin/submissions");
  revalidatePath("/dashboard/admin");
}

/** Rejects or requests changes on a submission, with optional admin notes. */
export async function setSubmissionStatus(formData: FormData) {
  const submissionId = String(formData.get("submission_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!submissionId) return;
  if (!["rejected", "needs_changes"].includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("property_submissions")
    .update({
      status,
      admin_notes: notes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  revalidatePath("/dashboard/admin/submissions");
  revalidatePath("/dashboard/admin");
}
