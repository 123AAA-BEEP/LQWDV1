"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth";
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
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_leads")
    .update({ status })
    .eq("id", id)
    .eq("assigned_realtor_profile_id", profile.id);

  revalidatePath("/dashboard/leads");
  if (error) {
    redirectWithFlash(
      "/dashboard/leads",
      "Couldn't update that lead — please try again.",
      "error",
    );
  }
  redirectWithFlash(
    "/dashboard/leads",
    `Lead moved to "${LEAD_STATUS_META[status as LeadStatus].label}".`,
  );
}
