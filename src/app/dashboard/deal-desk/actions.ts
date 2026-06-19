"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Submits a response to an RFP. RLS enforces that the submitter is an approved
 * ultra realtor and is eligible for this RFP (open + invited or all_ultra).
 */
export async function submitRfpProposal(formData: FormData) {
  const rfpId = String(formData.get("rfp_id") ?? "");
  const conditions = String(formData.get("conditions") ?? "").trim();
  const narrative = String(formData.get("narrative") ?? "").trim();
  const priceOffer = numOrNull(formData.get("price_offer"));
  const units = intOrNull(formData.get("units"));

  const back = `/dashboard/deal-desk/${rfpId}`;
  if (!rfpId) redirect("/dashboard/deal-desk");
  if (!narrative && priceOffer == null && units == null) {
    redirect(`${back}?error=${encodeURIComponent("Add an offer or a short pitch.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("deal_rfp_proposals").insert({
    rfp_id: rfpId,
    submitted_by_user_id: user.id,
    price_offer: priceOffer,
    units,
    conditions: conditions || null,
    narrative: narrative || null,
    status: "submitted",
  });

  if (error) {
    redirect(`${back}?error=${encodeURIComponent("Could not submit your response.")}`);
  }

  redirect("/dashboard/deal-desk?message=submitted");
}

/** Withdraws the realtor's own response while it's still 'submitted'. */
export async function withdrawRfpProposal(formData: FormData) {
  const proposalId = String(formData.get("proposal_id") ?? "");
  if (!proposalId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("deal_rfp_proposals")
    .update({ status: "withdrawn" })
    .eq("id", proposalId)
    .eq("submitted_by_user_id", user.id)
    .eq("status", "submitted");

  revalidatePath("/dashboard/deal-desk");
}
