"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/leads";
import { redirectWithFlash } from "@/lib/flash";

/** Sets a lead's pipeline status (admin-only). */
export async function setLeadStatus(formData: FormData) {
  const id = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !LEAD_STATUSES.includes(status as LeadStatus)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase.from("project_leads").update({ status }).eq("id", id);

  revalidatePath("/dashboard/admin/leads");
  redirectWithFlash(
    "/dashboard/admin/leads",
    `Lead moved to "${LEAD_STATUS_META[status as LeadStatus].label}".`,
  );
}

/**
 * Pulls a lead into the admin pool — clears the assigned agent so LIQWD owns
 * the follow-up. (These are ultimately our leads.) Admin-only.
 */
export async function pullLeadToAdmin(formData: FormData) {
  const id = String(formData.get("lead_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("project_leads")
    .update({ assigned_realtor_profile_id: null })
    .eq("id", id);

  revalidatePath("/dashboard/admin/leads");
  redirectWithFlash(
    "/dashboard/admin/leads",
    "Lead pulled to the admin pool — LIQWD owns the follow-up.",
  );
}
