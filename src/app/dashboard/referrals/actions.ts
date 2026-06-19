"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserProfile, isDeveloper } from "@/lib/auth";

// Statuses a developer can set from their inbox (not 'new' / 'withdrawn').
const STATUSES = [
  "received",
  "in_progress",
  "client_not_submitting",
  "client_ineligible",
  "accepted",
  "declined",
];

/**
 * A granted developer drives the status of a referral to one of their projects.
 * RLS only permits the update when the project runs `service_mode = 'self_serve'`,
 * so this is a no-op for full-service projects (LIQWD works those).
 */
export async function setDeveloperReferralStatus(formData: FormData) {
  const id = String(formData.get("referral_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("developer_response_notes") ?? "").trim();
  if (!id || !STATUSES.includes(status)) return;

  const { userId, profile } = await requireUserProfile();
  if (!isDeveloper(profile)) return;

  const supabase = await createClient();
  await supabase
    .from("rental_referrals")
    .update({
      status,
      developer_response_notes: notes || null,
      reviewed_by_profile_id: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/dashboard/referrals");
}
