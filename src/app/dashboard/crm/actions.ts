"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { redirectWithFlash } from "@/lib/flash";

const CRM = "/dashboard/crm";
const KINDS = ["buyer", "investor", "seller", "renter", "past_client", "other"];
const INTEREST_STATUSES = ["interested", "sent_info", "hot", "closed"];
const ACTIVITY_KINDS = ["call", "email", "text", "meeting", "note"];

/**
 * All CRM writes are owner-scoped twice: RLS pins rows to auth.uid(), and
 * every mutation stamps agent_profile_id from the server-side profile — a
 * forged form value can't write into someone else's book.
 */

export async function createContact(formData: FormData) {
  const { profile } = await requireUserProfile();
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const rawKind = String(formData.get("contact_kind") ?? "");
  const consent = formData.get("consent_email") === "on";
  if (!name) redirectWithFlash(CRM, "A name is required.", "error");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      agent_profile_id: profile.id,
      name,
      email: email || null,
      phone: phone || null,
      contact_kind: KINDS.includes(rawKind) ? rawKind : null,
      consent_email: consent,
      consent_attested_at: consent ? new Date().toISOString() : null,
    })
    .select("id")
    .maybeSingle();

  revalidatePath(CRM);
  if (error?.code === "23505") {
    redirectWithFlash(CRM, "You already have a contact with that email.", "error");
  }
  if (error || !data) {
    redirectWithFlash(CRM, "Couldn't add the contact.", "error");
  }
  redirect(`${CRM}/${data.id}`);
}

/** One-click save from the Leads inbox — the lead becomes a client record. */
export async function saveLeadToClients(formData: FormData) {
  const { profile } = await requireUserProfile();
  const leadId = String(formData.get("lead_id") ?? "");
  if (!leadId) redirectWithFlash("/dashboard/leads", "Missing lead.", "error");

  const supabase = await createClient();
  // RLS: realtors read only their own assigned leads.
  const { data: lead } = await supabase
    .from("project_leads")
    .select("id, lead_name, lead_email, lead_phone")
    .eq("id", leadId)
    .eq("assigned_realtor_profile_id", profile.id)
    .maybeSingle();
  if (!lead) {
    redirectWithFlash("/dashboard/leads", "That lead isn't yours to save.", "error");
  }

  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      agent_profile_id: profile.id,
      name: lead.lead_name,
      email: (lead.lead_email ?? "").toLowerCase() || null,
      phone: lead.lead_phone || null,
      contact_kind: "buyer",
      source_lead_id: lead.id,
      // Lead-sourced contacts start WITHOUT email consent — an inquiry is
      // implied consent to reply, not to receive a newsletter. The agent
      // attests consent explicitly on the contact page.
      consent_email: false,
    })
    .select("id")
    .maybeSingle();

  if (error?.code === "23505") {
    redirectWithFlash("/dashboard/leads", "Already in your clients.", "info");
  }
  if (error || !data) {
    redirectWithFlash("/dashboard/leads", "Couldn't save that lead.", "error");
  }
  redirect(`${CRM}/${data.id}?flash=${encodeURIComponent("Saved to your clients.")}&flash_tone=success`);
}

export async function updateContact(formData: FormData) {
  const { profile } = await requireUserProfile();
  const id = String(formData.get("contact_id") ?? "");
  if (!id) redirectWithFlash(CRM, "Missing contact.", "error");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!name) redirectWithFlash(`${CRM}/${id}`, "A name is required.", "error");
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 320);
  const rawKind = String(formData.get("contact_kind") ?? "");
  const consent = formData.get("consent_email") === "on";

  const supabase = await createClient();
  // Preserve the original attestation timestamp unless consent newly flips on.
  const { data: existing } = await supabase
    .from("crm_contacts")
    .select("consent_email, consent_attested_at")
    .eq("id", id)
    .eq("agent_profile_id", profile.id)
    .maybeSingle();
  if (!existing) redirectWithFlash(CRM, "Contact not found.", "error");

  const { error } = await supabase
    .from("crm_contacts")
    .update({
      name,
      email: email || null,
      phone: String(formData.get("phone") ?? "").trim().slice(0, 40) || null,
      contact_kind: KINDS.includes(rawKind) ? rawKind : null,
      notes: String(formData.get("notes") ?? "").trim().slice(0, 4000) || null,
      consent_email: consent,
      consent_attested_at: consent
        ? (existing.consent_email ? existing.consent_attested_at : new Date().toISOString())
        : existing.consent_attested_at,
      archived: formData.get("archived") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("agent_profile_id", profile.id);

  revalidatePath(`${CRM}/${id}`);
  revalidatePath(CRM);
  if (error) {
    redirectWithFlash(
      `${CRM}/${id}`,
      error.code === "23505"
        ? "You already have another contact with that email."
        : "Couldn't save.",
      "error",
    );
  }
  redirectWithFlash(`${CRM}/${id}`, "Saved.");
}

export async function addInterest(formData: FormData) {
  const { profile } = await requireUserProfile();
  const contactId = String(formData.get("contact_id") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  if (!contactId || !projectId) {
    redirectWithFlash(CRM, "Pick a project.", "error");
  }
  const supabase = await createClient();
  await supabase.from("crm_contact_interests").insert({
    agent_profile_id: profile.id,
    contact_id: contactId,
    project_id: projectId,
  });
  revalidatePath(`${CRM}/${contactId}`);
  redirectWithFlash(`${CRM}/${contactId}`, "Project added to their interests.");
}

export async function setInterestStatus(formData: FormData) {
  const { profile } = await requireUserProfile();
  const id = String(formData.get("interest_id") ?? "");
  const contactId = String(formData.get("contact_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !INTEREST_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("crm_contact_interests")
    .update({ status })
    .eq("id", id)
    .eq("agent_profile_id", profile.id);
  revalidatePath(`${CRM}/${contactId}`);
  redirectWithFlash(`${CRM}/${contactId}`, `Interest marked ${status.replace("_", " ")}.`);
}

export async function logActivity(formData: FormData) {
  const { profile } = await requireUserProfile();
  const contactId = String(formData.get("contact_id") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const outcome = String(formData.get("outcome") ?? "").trim().slice(0, 1000);
  if (!contactId || !ACTIVITY_KINDS.includes(kind)) return;
  const supabase = await createClient();
  await supabase.from("crm_activities").insert({
    agent_profile_id: profile.id,
    contact_id: contactId,
    kind,
    outcome: outcome || null,
  });
  revalidatePath(`${CRM}/${contactId}`);
  redirectWithFlash(`${CRM}/${contactId}`, "Logged.");
}

export async function addTask(formData: FormData) {
  const { profile } = await requireUserProfile();
  const contactId = String(formData.get("contact_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const dueOn = String(formData.get("due_on") ?? "").trim();
  const backTo = contactId ? `${CRM}/${contactId}` : CRM;
  if (!title) redirectWithFlash(backTo, "Give the task a title.", "error");
  const supabase = await createClient();
  await supabase.from("crm_tasks").insert({
    agent_profile_id: profile.id,
    contact_id: contactId,
    title,
    due_on: /^\d{4}-\d{2}-\d{2}$/.test(dueOn) ? dueOn : null,
  });
  revalidatePath(backTo);
  revalidatePath(CRM);
  redirectWithFlash(backTo, "Task added.");
}

export async function completeTask(formData: FormData) {
  const { profile } = await requireUserProfile();
  const id = String(formData.get("task_id") ?? "");
  const backTo = String(formData.get("back_to") ?? CRM);
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("crm_tasks")
    .update({ done_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agent_profile_id", profile.id);
  revalidatePath(backTo);
  redirectWithFlash(backTo, "Done ✓");
}
