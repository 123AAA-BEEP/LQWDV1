"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/leads";
import { redirectWithFlash } from "@/lib/flash";
import { sendEmail, brandedEmail } from "@/lib/email";

/** Sets a lead's pipeline status (admin-only). */
export async function setLeadStatus(formData: FormData) {
  const id = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !LEAD_STATUSES.includes(status as LeadStatus)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase.from("project_leads").update({ status }).eq("id", id);

  // Speed-to-lead: the first move off "new" stamps first_responded_at, once.
  if (status !== "new") {
    await supabase
      .from("project_leads")
      .update({ first_responded_at: new Date().toISOString() })
      .eq("id", id)
      .is("first_responded_at", null);
  }

  revalidatePath("/dashboard/admin/leads");
  revalidatePath(`/dashboard/admin/leads/${id}`);
  redirectWithFlash(
    String(formData.get("back_to") ?? "") === "detail"
      ? `/dashboard/admin/leads/${id}`
      : "/dashboard/admin/leads",
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
  const backTo =
    String(formData.get("back_to") ?? "") === "detail"
      ? `/dashboard/admin/leads/${id}`
      : "/dashboard/admin/leads";

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("project_leads")
    .update({ assigned_realtor_profile_id: null })
    .eq("id", id);

  revalidatePath("/dashboard/admin/leads");
  revalidatePath(`/dashboard/admin/leads/${id}`);
  redirectWithFlash(
    backTo,
    "Lead pulled to the admin pool — LIQWD owns the follow-up.",
  );
}

/**
 * Assigns (or reassigns) a lead to an APPROVED realtor and alerts them by
 * email. Admin-only; the target is validated server-side so a forged form
 * can't route a lead to an unverified account.
 */
export async function assignLeadToRealtor(formData: FormData) {
  const id = String(formData.get("lead_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  const backTo = `/dashboard/admin/leads/${id}`;
  if (!id || !profileId) {
    redirectWithFlash("/dashboard/admin/leads", "Pick an agent.", "error");
  }

  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: agent } = await supabase
    .from("profiles")
    .select("id, first_name, email")
    .eq("id", profileId)
    .eq("role", "realtor")
    .eq("verification_status", "approved")
    .maybeSingle();
  if (!agent) {
    redirectWithFlash(backTo, "That agent isn't approved to receive leads.", "error");
  }

  const { data: lead } = await supabase
    .from("project_leads")
    .update({ assigned_realtor_profile_id: agent.id })
    .eq("id", id)
    .select("lead_name, lead_email, lead_phone, message, project_id")
    .maybeSingle();
  if (!lead) {
    redirectWithFlash(backTo, "Couldn't assign that lead.", "error");
  }

  // Alert the agent — speed-to-lead starts the moment they know.
  if (agent.email) {
    let projectName = "a LIQWD project";
    if (lead.project_id) {
      const { data: proj } = await supabase
        .from("projects")
        .select("project_name")
        .eq("id", lead.project_id)
        .maybeSingle();
      if (proj?.project_name) projectName = proj.project_name;
    }
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
    void sendEmail({
      to: agent.email,
      replyTo: lead.lead_email,
      subject: `New lead assigned to you: ${lead.lead_name} (${projectName})`,
      html: brandedEmail({
        heading: "A lead was just assigned to you",
        body:
          `Hi ${agent.first_name ?? "there"}, LIQWD routed you a buyer for ` +
          `${projectName}: <strong>${lead.lead_name}</strong> · ${lead.lead_email}` +
          `${lead.lead_phone ? ` · ${lead.lead_phone}` : ""}` +
          `${lead.message ? `<br><br>"${lead.message.replace(/</g, "&lt;")}"` : ""}` +
          `<br><br>Speed decides these — call or reply now (replies go straight to them). This lead is free.`,
        ctaUrl: `${base}/dashboard/leads`,
        ctaLabel: "Open your Leads inbox",
      }),
    });
  }

  revalidatePath("/dashboard/admin/leads");
  revalidatePath(backTo);
  redirectWithFlash(backTo, "Assigned — the agent's been emailed.");
}
