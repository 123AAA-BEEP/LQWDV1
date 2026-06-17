"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Submits a property update request against an existing project.
 * Approved realtors (and admins) only. RLS allows insert where
 * submitted_by_user_id = auth.uid().
 */
export async function submitUpdateRequest(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const updateType = String(formData.get("update_type") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  // Image attachments are uploaded to the `project-documents` bucket from the
  // browser; we receive their storage paths here.
  const attachments = formData
    .getAll("attachment_paths")
    .map((p) => String(p).trim())
    .filter(Boolean);

  const back = `/dashboard/projects/${slug}/update`;

  if (!projectId || !updateType) {
    redirect(`${back}?error=${encodeURIComponent("Please choose what to update.")}`);
  }
  if (!details && attachments.length === 0) {
    redirect(
      `${back}?error=${encodeURIComponent("Please describe the change or attach an image.")}`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Approved-only (defense in depth alongside the page gate).
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.verification_status !== "approved") {
    redirect(
      `${back}?error=${encodeURIComponent("Verification is required to suggest updates.")}`,
    );
  }

  const { error } = await supabase.from("property_update_requests").insert({
    project_id: projectId,
    submitted_by_user_id: user.id,
    update_type: updateType,
    update_payload: { details: details || null, attachments },
    status: "pending_review",
  });

  if (error) {
    redirect(`${back}?error=${encodeURIComponent("Could not submit. Please try again.")}`);
  }

  redirect("/dashboard/updates?message=submitted");
}
