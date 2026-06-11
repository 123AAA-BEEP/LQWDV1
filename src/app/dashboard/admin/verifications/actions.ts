"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

type Decision = "approved" | "rejected" | "suspended";

/**
 * Decides a verification request and mirrors the result onto the user's
 * profile.verification_status. Admin-only (RLS + assertAdmin).
 */
export async function decideVerification(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as Decision;

  if (!requestId || !profileId) return;
  if (!["approved", "rejected", "suspended"].includes(decision)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("verification_requests")
    .update({
      status: decision,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  await supabase
    .from("profiles")
    .update({ verification_status: decision })
    .eq("id", profileId);

  revalidatePath("/dashboard/admin/verifications");
  revalidatePath("/dashboard/admin");
}
