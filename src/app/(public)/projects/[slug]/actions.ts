"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLeadSteward } from "@/lib/rewards";

/**
 * Public lead capture. Runs server-side with the service-role client so lead
 * routing is trusted (not client-supplied): if the project's public page has an
 * active lead steward — a realtor whose submission/update was approved and
 * whose stewardship hasn't expired or been bumped — the lead is assigned to
 * them. Otherwise it falls to the admin pool. No private data is exposed.
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

  if (!project_id || !lead_name || !lead_email) {
    return { error: "Please provide your name and email." };
  }

  const admin = createAdminClient();

  const assignedRealtorId = public_page_id
    ? await resolveLeadSteward(admin, public_page_id)
    : null;

  const { error } = await admin.from("project_leads").insert({
    project_id,
    public_project_page_id: public_page_id || null,
    assigned_realtor_profile_id: assignedRealtorId,
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
