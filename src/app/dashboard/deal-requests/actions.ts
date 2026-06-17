"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s === null) return null;
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const RFP_TYPES = [
  "new_listing",
  "bulk_purchase",
  "inventory_unit",
  "trouble_unit",
  "full_development",
];
const HIDEABLE = ["brief", "target_units", "target_price", "deadline"];

/** Developer creates a deal request (RFP). */
export async function createRfp(formData: FormData) {
  const { userId, profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard");

  const title = str(formData, "title");
  if (!title) redirect("/dashboard/deal-requests/new?error=1");

  const rfpType = str(formData, "rfp_type") ?? "bulk_purchase";
  const dealSide = str(formData, "deal_side") === "list" ? "list" : "buy";
  const visibility =
    str(formData, "visibility") === "invited" ? "invited" : "all_ultra";
  const publish = formData.get("publish") === "on" || formData.get("publish") === "true";
  const hidden = HIDEABLE.filter((f) => formData.get(`hide_${f}`) === "on");
  const deadline = str(formData, "deadline_at");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_rfps")
    .insert({
      created_by_user_id: userId,
      rfp_type: RFP_TYPES.includes(rfpType) ? rfpType : "bulk_purchase",
      deal_side: dealSide,
      title,
      brief: str(formData, "brief"),
      target_units: num(formData, "target_units"),
      target_price: num(formData, "target_price"),
      deadline_at: deadline ? new Date(deadline).toISOString() : null,
      visibility,
      hidden_fields: hidden,
      status: publish ? "open" : "draft",
    })
    .select("id")
    .single();

  if (error || !data) redirect("/dashboard/deal-requests/new?error=1");
  revalidatePath("/dashboard/deal-requests");
  redirect(`/dashboard/deal-requests/${data.id}`);
}

/** Owner changes their RFP's status (publish / close / reopen). */
export async function setRfpStatus(formData: FormData) {
  await requireUserProfile();
  const rfpId = str(formData, "rfp_id");
  const status = str(formData, "status");
  if (!rfpId || !status) return;
  if (!["draft", "open", "shortlisting", "awarded", "closed", "cancelled"].includes(status)) {
    return;
  }

  const supabase = await createClient();
  // RLS: only the owning developer (or admin) may update.
  await supabase.from("deal_rfps").update({ status }).eq("id", rfpId);
  revalidatePath(`/dashboard/deal-requests/${rfpId}`);
}

/** Owner shortlists / awards / declines a proposal on their RFP. */
export async function respondToProposal(formData: FormData) {
  await requireUserProfile();
  const proposalId = str(formData, "proposal_id");
  const rfpId = str(formData, "rfp_id");
  const decision = str(formData, "decision");
  if (!proposalId || !decision) return;
  if (!["shortlisted", "awarded", "declined"].includes(decision)) return;

  const supabase = await createClient();
  // RLS: owns_rfp(rfp_id) permits the developer who owns the RFP.
  await supabase
    .from("deal_rfp_proposals")
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq("id", proposalId);
  if (rfpId) revalidatePath(`/dashboard/deal-requests/${rfpId}`);
}
