"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLeadSteward } from "@/lib/rewards";

/**
 * Public lead capture. Runs server-side with the service-role client so lead
 * routing is trusted (not client-supplied):
 *
 *   - If the buyer arrived via a realtor's direct referral link
 *     (`/projects/<slug>?ref=<referral_code>`) and that code maps to an APPROVED
 *     realtor, the lead is attributed to and routed to that realtor — the link
 *     sharer wins over the page's default steward (`referred_by_profile_id`).
 *   - Otherwise, if the project's public page has an active lead steward — a
 *     realtor whose submission/update was approved and whose stewardship hasn't
 *     expired or been bumped — the lead is assigned to them.
 *   - Otherwise it falls to the admin pool.
 *
 * No private data is exposed.
 */
export async function submitLead(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const project_id = String(formData.get("project_id") ?? "");
  const public_page_id = String(formData.get("public_page_id") ?? "");
  const lead_name = String(formData.get("lead_name") ?? "").trim();
  const lead_email = String(formData.get("lead_email") ?? "").trim();
  const lead_phone = String(formData.get("lead_phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Referral codes are uppercase alphanumerics; normalise so a pasted/lowercased
  // link still attributes correctly.
  const ref = String(formData.get("ref") ?? "")
    .trim()
    .toUpperCase();

  if (!project_id || !lead_name || !lead_email) {
    return { error: "Please provide your name and email." };
  }

  const admin = createAdminClient();

  // Resolve the referral code to an approved realtor (the link sharer). Only
  // approved realtors can receive leads, so an unknown/unapproved code is
  // ignored and we fall back to normal steward routing.
  let referredById: string | null = null;
  if (ref) {
    const { data: refProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", ref)
      .eq("role", "realtor")
      .eq("verification_status", "approved")
      .maybeSingle();
    referredById = (refProfile?.id as string | undefined) ?? null;
  }

  const stewardId = public_page_id
    ? await resolveLeadSteward(admin, public_page_id)
    : null;

  // Link sharer wins: a valid referrer takes the lead over the page steward.
  const assignedRealtorId = referredById ?? stewardId;

  const { error } = await admin.from("project_leads").insert({
    project_id,
    public_project_page_id: public_page_id || null,
    assigned_realtor_profile_id: assignedRealtorId,
    referred_by_profile_id: referredById,
    lead_name,
    lead_email,
    lead_phone: lead_phone || null,
    message: message || null,
    status: "new",
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }
}
