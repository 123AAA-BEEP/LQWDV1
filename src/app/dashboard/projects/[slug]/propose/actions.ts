"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Parse a positive number from a form field, or null when blank/invalid. */
function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Files a worksheet (or freeform) proposal against an existing project.
 * Approved realtors only. RLS allows insert where
 * submitted_by_user_id = auth.uid() and the realtor is approved.
 */
export async function submitProposal(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const projectId = String(formData.get("project_id") ?? "");
  const format = String(formData.get("proposal_format") ?? "worksheet");
  const consideration = String(formData.get("consideration") ?? "").trim();
  const narrative = String(formData.get("narrative") ?? "").trim();
  const incentiveAsk = String(formData.get("incentive_ask") ?? "").trim();
  const commissionAsk = num(formData.get("commission_ask_percent"));
  const priceReduction = num(formData.get("price_reduction_ask"));
  const validUntil = String(formData.get("valid_until") ?? "").trim();

  const back = `/dashboard/projects/${slug}/propose`;
  const fail = (msg: string) =>
    redirect(`${back}?error=${encodeURIComponent(msg)}`);

  if (!projectId || !["worksheet", "freeform"].includes(format)) {
    fail("Something went wrong. Please try again.");
  }
  if (!consideration) {
    fail("Tell the developer what you'll commit to in exchange.");
  }
  if (format === "worksheet" && !commissionAsk && !priceReduction && !incentiveAsk) {
    fail("Add at least one ask: commission, price reduction, or incentives.");
  }
  if (format === "freeform" && !narrative) {
    fail("Describe your proposal.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Approved-only (defense in depth alongside the page gate and RLS).
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.verification_status !== "approved") {
    fail("Verification is required to submit a proposal.");
  }

  const { error } = await supabase.from("project_proposals").insert({
    project_id: projectId,
    submitted_by_user_id: user.id,
    proposal_format: format,
    commission_ask_percent: format === "worksheet" ? commissionAsk : null,
    price_reduction_ask: format === "worksheet" ? priceReduction : null,
    incentive_ask: format === "worksheet" ? incentiveAsk || null : null,
    consideration,
    narrative: narrative || null,
    valid_until: validUntil || null,
    status: "submitted",
  });

  if (error) {
    fail("Could not submit your proposal. Please try again.");
  }

  redirect("/dashboard/proposals?message=submitted");
}
