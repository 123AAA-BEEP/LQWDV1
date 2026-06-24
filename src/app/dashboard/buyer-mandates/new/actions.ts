"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserProfile, isApproved, isPro } from "@/lib/auth";
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
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === "on" || fd.get(key) === "true";
}

const PREAPPROVAL = ["none", "pre_qualified", "pre_approved"];
const FINANCING = ["cash", "mortgage", "mixed"];

/** Creates a Buyer Mandate. RLS enforces approved + Pro + own. */
export async function createMandate(formData: FormData) {
  const { userId, profile } = await requireUserProfile();
  if (!isApproved(profile)) redirect("/dashboard/verify");
  if (!isPro(profile)) redirect("/dashboard/upgrade");

  const preApproval = str(formData, "pre_approval_status") ?? "none";
  const financing = str(formData, "financing_type");

  const supabase = await createClient();
  const { error } = await supabase.from("buyer_mandates").insert({
    submitted_by_user_id: userId,
    buyer_label: str(formData, "buyer_label"),
    status: "active",
    location_areas: str(formData, "location_areas"),
    location_radius_km: num(formData, "location_radius_km"),
    price_min: num(formData, "price_min"),
    price_max: num(formData, "price_max"),
    financing_type: financing && FINANCING.includes(financing) ? financing : null,
    size_sqft_min: num(formData, "size_sqft_min"),
    size_sqft_max: num(formData, "size_sqft_max"),
    beds_min: num(formData, "beds_min"),
    baths_min: num(formData, "baths_min"),
    lot_notes: str(formData, "lot_notes"),
    property_type: str(formData, "property_type"),
    condition: str(formData, "condition"),
    timeline: str(formData, "timeline"),
    must_haves: str(formData, "must_haves"),
    nice_to_haves: str(formData, "nice_to_haves"),
    pre_approval_status: PREAPPROVAL.includes(preApproval) ? preApproval : "none",
    pre_approval_amount: num(formData, "pre_approval_amount"),
    lender: str(formData, "lender"),
    pre_approval_expiry: str(formData, "pre_approval_expiry"),
    proof_of_funds: bool(formData, "proof_of_funds"),
    rep_agreement_signed: bool(formData, "rep_agreement_signed"),
    id_verified: bool(formData, "id_verified"),
    deposit_ready: bool(formData, "deposit_ready"),
  });

  if (error) {
    redirect("/dashboard/buyer-mandates/new?error=1");
  }

  revalidatePath("/dashboard/buyer-mandates");
  redirect("/dashboard/buyer-mandates?created=1");
}
