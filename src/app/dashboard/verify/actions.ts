"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Submits a RECO verification request. RLS permits insert where
 * profile_id = auth.uid(). The profile is also moved to 'pending'.
 * Admin review (separate flow) flips it to approved/rejected.
 */
export async function submitVerification(formData: FormData) {
  const reco = String(formData.get("reco_registration_number") ?? "").trim();
  const brokerage = String(formData.get("brokerage_name_submitted") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!reco) {
    redirect("/dashboard/verify?error=" + encodeURIComponent("RECO registration number is required."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("verification_requests").insert({
    profile_id: user.id,
    reco_registration_number: reco,
    brokerage_name_submitted: brokerage || null,
    notes: notes || null,
    status: "pending",
  });

  if (error) {
    redirect("/dashboard/verify?error=" + encodeURIComponent("Could not submit. Please try again."));
  }

  // Reflect the RECO number on the profile and ensure status is pending.
  await supabase
    .from("profiles")
    .update({
      reco_registration_number: reco,
      verification_status: "pending",
    })
    .eq("id", user.id);

  redirect("/dashboard/verify?message=submitted");
}
