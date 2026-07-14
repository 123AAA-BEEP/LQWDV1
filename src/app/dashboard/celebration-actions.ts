"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Stamps the one-time "you're verified" celebration. Called by the client
 * confetti component the moment the approved celebration renders, so the big
 * burst fires exactly once per account across devices and approval paths
 * (manual admin review or instant auto-verification). Owner-scoped by RLS;
 * the null-guard makes concurrent calls harmless.
 */
export async function markVerificationCelebrated(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ verification_celebrated_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("verification_celebrated_at", null);
}

/**
 * Confetti moment #3 — the first buyer lead. Same once-ever DB-flag pattern
 * as the verification celebration; "time to first lead" stays derivable as
 * min(project_leads.created_at) − reco_verified_at.
 */
export async function markFirstLeadCelebrated(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ first_lead_celebrated_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("first_lead_celebrated_at", null);
}
