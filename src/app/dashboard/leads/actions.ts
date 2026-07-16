"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/leads";
import { redirectWithFlash } from "@/lib/flash";

/**
 * Moves one of the caller's own leads through the pipeline. RLS already
 * restricts updates to leads assigned to the caller; the explicit
 * `assigned_realtor_profile_id` filter is defence in depth (and keeps an
 * admin from accidentally re-statusing someone else's lead from this page —
 * the admin console owns that).
 */
export async function updateLeadStatus(formData: FormData) {
  const id = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !LEAD_STATUSES.includes(status as LeadStatus)) return;

  const { profile } = await requireUserProfile();
  // Same gate as the page: working leads is a verified-agent tool.
  if (!isApproved(profile)) {
    redirectWithFlash(
      "/dashboard/leads",
      "Your verification needs to be active to work leads.",
      "error",
    );
  }

  const supabase = await createClient();
  // .select() so a zero-row match (lead reassigned/pulled to the admin pool
  // mid-flight, or a forged id) reads as the failure it is, not a success.
  const { data: updated, error } = await supabase
    .from("project_leads")
    .update({ status })
    .eq("id", id)
    .eq("assigned_realtor_profile_id", profile.id)
    .select("id");

  revalidatePath("/dashboard/leads");
  if (error || !updated?.length) {
    redirectWithFlash(
      "/dashboard/leads",
      "Couldn't update that lead — it may no longer be assigned to you.",
      "error",
    );
  }
  redirectWithFlash(
    "/dashboard/leads",
    `Lead moved to "${LEAD_STATUS_META[status as LeadStatus].label}".`,
  );
}
