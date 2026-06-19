"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { awardReferralVerificationBonus } from "@/lib/rewards";

type Decision = "approved" | "rejected" | "suspended";

/**
 * Decides a verification request and mirrors the result onto the user's
 * profile.verification_status. Works both for submitted RECO requests and for
 * users who only signed up (no request row yet — request_id omitted).
 * Admin-only (RLS + assertAdmin).
 */
export async function decideVerification(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const decision = String(formData.get("decision") ?? "") as Decision;

  if (!profileId) return;
  if (!["approved", "rejected", "suspended"].includes(decision)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  if (requestId) {
    await supabase
      .from("verification_requests")
      .update({
        status: decision,
        reviewed_by_user_id: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
  }

  await supabase
    .from("profiles")
    .update({ verification_status: decision })
    .eq("id", profileId);

  // If this agent was referred, pay the referral verification bonus to both
  // parties (idempotent; no-op if they weren't referred).
  if (decision === "approved") {
    await awardReferralVerificationBonus(profileId);
  }

  revalidatePath("/dashboard/admin/verifications");
  revalidatePath("/dashboard/admin");
}
