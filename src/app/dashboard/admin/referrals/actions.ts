"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

const STATUSES = [
  "new",
  "received",
  "in_progress",
  "client_not_submitting",
  "client_ineligible",
  "accepted",
  "declined",
  "withdrawn",
];

/**
 * Drive a rental referral's status (admin / full-service). The agent sees this
 * status on their Quick Wins page; "accepted" is the cue for the agent's
 * brokerage to invoice the operator.
 */
export async function setReferralStatus(formData: FormData) {
  const id = String(formData.get("referral_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("developer_response_notes") ?? "").trim();
  if (!id || !STATUSES.includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("rental_referrals")
    .update({
      status,
      developer_response_notes: notes || null,
      reviewed_by_profile_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/dashboard/admin/referrals");
  revalidatePath("/dashboard/admin");
}
