"use server";

import { requireUserProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stamps the once-only signup conversion (migration 0103). Called by the
 * SignupConversion client component right after gtag fired, so a reload can
 * never double-count. Idempotent: the `.is(null)` guard makes a second call
 * a no-op.
 */
export async function markSignupConversionFired() {
  const { userId } = await requireUserProfile();
  await createAdminClient()
    .from("profiles")
    .update({ signup_conversion_fired_at: new Date().toISOString() })
    .eq("id", userId)
    .is("signup_conversion_fired_at", null);
}
