"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserProfile } from "@/lib/auth";
import {
  extractRecoCertificate,
  recoCertificateApproves,
  type RecoExtract,
} from "@/lib/reco";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 4_000_000; // stay under Vercel's server-action body limit

function verifyRedirect(code: string): never {
  redirect("/dashboard/verify?reco=" + code);
}

/**
 * Instant verification: parse an uploaded RECO certificate and, on a confident
 * match, auto-approve the realtor. The file is read in memory and never stored
 * (verify-and-purge); we persist only the extracted expiry + an audit row.
 */
export async function verifyRecoCertificate(formData: FormData) {
  const { profile, userId } = await requireUserProfile();
  if (profile.verification_status === "approved") verifyRedirect("already");

  const file = formData.get("certificate");
  if (!(file instanceof File) || file.size === 0) verifyRedirect("nofile");
  if (!ACCEPTED.includes(file.type)) verifyRedirect("badtype");
  if (file.size > MAX_BYTES) verifyRedirect("toobig");

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  let ex: RecoExtract | null = null;
  try {
    ex = await extractRecoCertificate(base64, file.type);
  } catch {
    ex = null;
  }
  if (!ex) verifyRedirect("unavailable");

  const approves = recoCertificateApproves(ex, profile);
  const admin = createAdminClient();

  // Audit every attempt (no document retained) for admin spot-checks.
  const { error: auditErr } = await admin.from("reco_verification_audits").insert({
    profile_id: userId,
    method: "certificate",
    matched: approves,
    extracted_name: [ex.full_name, ex.legal_name].filter(Boolean).join(" / ") || null,
    extracted_reco_number: ex.reco_registration_number || null,
    extracted_status: ex.status,
    extracted_expiry: ex.expiry_date,
    profile_name: [profile.first_name, profile.last_name].filter(Boolean).join(" ") || null,
    profile_reco: profile.reco_registration_number,
  });

  if (!approves) verifyRedirect("nomatch");

  const { data: updated, error: updErr } = await admin
    .from("profiles")
    .update({
      verification_status: "approved",
      reco_registration_number: ex.reco_registration_number,
      reco_expiry: ex.expiry_date,
      reco_verified_at: new Date().toISOString(),
      reco_verification_method: "certificate",
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  // Never report success if the write didn't persist. Surface a concise reason
  // (TEMP DIAGNOSTIC) so a misconfigured service-role key is unambiguous:
  //   - updErr present  -> invalid/expired key (PostgREST 401/JWT error)
  //   - 0 rows, no err  -> client is acting as anon (RLS dropped the write)
  if (updErr || !updated) {
    const reason = updErr
      ? `update: ${updErr.code ?? ""} ${updErr.message ?? ""}`.trim()
      : auditErr
        ? `audit: ${auditErr.code ?? ""} ${auditErr.message ?? ""}`.trim()
        : "update affected 0 rows (RLS) — admin client is not service_role";
    redirect("/dashboard/verify?reco=saveerror&why=" + encodeURIComponent(reason.slice(0, 160)));
  }

  // Invalidate every dashboard segment so the new approved state ungates
  // Projects, the sidebar, etc. immediately (no hard refresh needed).
  revalidatePath("/dashboard", "layout");

  verifyRedirect("approved");
}

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
