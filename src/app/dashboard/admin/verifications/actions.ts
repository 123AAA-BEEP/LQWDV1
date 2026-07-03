"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { awardReferralVerificationBonus } from "@/lib/rewards";
import { sendAgentVerifiedEmail } from "@/lib/email";
import { publishHeldListingsFor } from "@/lib/off-market";
import { redirectWithFlash } from "@/lib/flash";
import { registerCheck } from "@/lib/license-check";
import { isRegionKey } from "@/lib/regions";

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
    await sendVerificationApprovedEmail(supabase, profileId);
    // Publish any off-market listings this agent claimed before being verified
    // (held dark until now). Admin RLS permits the update.
    await publishHeldListingsFor(supabase, profileId);
  }

  revalidatePath("/dashboard/admin/verifications");
  revalidatePath("/dashboard/admin");
  redirectWithFlash(
    "/dashboard/admin/verifications",
    decision === "approved"
      ? "Agent approved — broker access unlocked and any held listings published."
      : decision === "rejected"
        ? "Verification rejected."
        : "Agent suspended.",
    decision === "approved" ? "success" : "info",
  );
}

/**
 * One-click register check from the queue (BC / Florida): fetches the
 * regulator's public register and appends the verdict to the request notes so
 * the admin can approve with evidence — or trust it and approve immediately.
 */
export async function runRegisterCheck(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const regionRaw = String(formData.get("license_region") ?? "");
  const license = String(formData.get("license_number") ?? "").trim();
  const name = String(formData.get("agent_name") ?? "").trim() || null;
  if (!requestId || !license || !isRegionKey(regionRaw)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const check = await registerCheck(regionRaw, license, name);

  const { data: cur } = await supabase
    .from("verification_requests")
    .select("notes")
    .eq("id", requestId)
    .maybeSingle();
  await supabase
    .from("verification_requests")
    .update({
      notes: [cur?.notes ?? null, `[register check] ${check.detail}`]
        .filter(Boolean)
        .join("\n"),
    })
    .eq("id", requestId);

  revalidatePath("/dashboard/admin/verifications");
  redirectWithFlash(
    "/dashboard/admin/verifications",
    check.active_match
      ? `Register check PASSED: ${check.detail} Safe to approve.`
      : `Register check: ${check.detail}`,
    check.active_match ? "success" : "info",
  );
}

/**
 * Fires the automated "you're verified" welcome email when an agent is
 * approved. Fire-and-forget: sendEmail never throws and is a no-op until Resend
 * is configured (RESEND_API_KEY + EMAIL_FROM in Vercel), so approval is never
 * blocked or broken by mail.
 */
async function sendVerificationApprovedEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
) {
  const { data: who } = await supabase
    .from("profiles")
    .select("email, first_name")
    .eq("id", profileId)
    .maybeSingle();
  if (who?.email) await sendAgentVerifiedEmail(who.email, who.first_name ?? null);
}
