"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { RFP_TYPE_OPTIONS, RFP_HIDEABLE_KEYS } from "@/lib/status";

/** Keeps only recognized hideable field keys from a form's hidden_fields[]. */
function parseHiddenFields(formData: FormData): string[] {
  return formData
    .getAll("hidden_fields")
    .map((v) => String(v))
    .filter((k) => RFP_HIDEABLE_KEYS.includes(k));
}

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isInteger(n) && n >= 0 ? n : null;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Creates an RFP (admin acts as the developer's proxy in Phase 1). */
export async function createRfp(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const rfpType = String(formData.get("rfp_type") ?? "");
  const dealSide = String(formData.get("deal_side") ?? "");
  const visibility = String(formData.get("visibility") ?? "invited");
  const brief = String(formData.get("brief") ?? "").trim();
  const deadline = String(formData.get("deadline_at") ?? "").trim();
  const publish = String(formData.get("publish") ?? "") === "1";

  const back = "/dashboard/admin/rfps";
  if (!title || !RFP_TYPE_OPTIONS.includes(rfpType) || !["buy", "list"].includes(dealSide)) {
    redirect(`${back}?error=${encodeURIComponent("Title, type and side are required.")}`);
  }

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  const { data, error } = await supabase
    .from("deal_rfps")
    .insert({
      created_by_user_id: adminId,
      title,
      rfp_type: rfpType,
      deal_side: dealSide,
      visibility: visibility === "all_ultra" ? "all_ultra" : "invited",
      brief: brief || null,
      target_units: intOrNull(formData.get("target_units")),
      target_price: numOrNull(formData.get("target_price")),
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
      hidden_fields: parseHiddenFields(formData),
      status: publish ? "open" : "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`${back}?error=${encodeURIComponent("Could not create the RFP.")}`);
  }

  redirect(`${back}/${data.id}`);
}

const RFP_STATUSES = ["draft", "open", "shortlisting", "awarded", "closed", "cancelled"];

/** Moves an RFP through its lifecycle. */
export async function updateRfpStatus(formData: FormData) {
  const rfpId = String(formData.get("rfp_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!rfpId || !RFP_STATUSES.includes(status)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase.from("deal_rfps").update({ status }).eq("id", rfpId);
  revalidatePath(`/dashboard/admin/rfps/${rfpId}`);
  revalidatePath("/dashboard/admin/rfps");
}

/** Updates which fields are hidden from realtors on an RFP. */
export async function updateRfpHiddenFields(formData: FormData) {
  const rfpId = String(formData.get("rfp_id") ?? "");
  if (!rfpId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("deal_rfps")
    .update({ hidden_fields: parseHiddenFields(formData) })
    .eq("id", rfpId);

  revalidatePath(`/dashboard/admin/rfps/${rfpId}`);
}

/** Invites an ultra realtor to a (private) RFP. */
export async function inviteRealtor(formData: FormData) {
  const rfpId = String(formData.get("rfp_id") ?? "");
  const profileId = String(formData.get("profile_id") ?? "");
  if (!rfpId || !profileId) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("deal_rfp_invitations")
    .upsert(
      { rfp_id: rfpId, profile_id: profileId, invited_by_user_id: adminId },
      { onConflict: "rfp_id,profile_id", ignoreDuplicates: true },
    );

  revalidatePath(`/dashboard/admin/rfps/${rfpId}`);
}

/** Removes an invitation. */
export async function removeInvitation(formData: FormData) {
  const invitationId = String(formData.get("invitation_id") ?? "");
  const rfpId = String(formData.get("rfp_id") ?? "");
  if (!invitationId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase.from("deal_rfp_invitations").delete().eq("id", invitationId);
  revalidatePath(`/dashboard/admin/rfps/${rfpId}`);
}

const PROPOSAL_DECISIONS = ["shortlisted", "awarded", "declined"];

/** Records an admin decision on an RFP response. */
export async function decideRfpProposal(formData: FormData) {
  const proposalId = String(formData.get("proposal_id") ?? "");
  const rfpId = String(formData.get("rfp_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!proposalId || !PROPOSAL_DECISIONS.includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("deal_rfp_proposals")
    .update({
      status,
      admin_notes: notes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  revalidatePath(`/dashboard/admin/rfps/${rfpId}`);
}
