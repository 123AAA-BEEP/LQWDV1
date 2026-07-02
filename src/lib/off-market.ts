/** Off-market claim helpers (shared by the board, detail, and claim pages). */

import type { SupabaseClient } from "@supabase/supabase-js";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/** The public claim link an admin sends to a listing's agent. */
export function claimUrlFor(token: string): string {
  return `${SITE_URL}/claim/${token}`;
}

/**
 * Publishes any off-market listings this agent claimed before being verified
 * (held dark as 'pending_claim'). MUST be called from EVERY path that approves
 * a realtor — instant certificate verification and admin review alike —
 * otherwise a claimed listing is stranded dark forever. Idempotent.
 */
export async function publishHeldListingsFor(
  db: SupabaseClient,
  profileId: string,
): Promise<void> {
  await db
    .from("off_market_listings")
    .update({ status: "published" })
    .eq("claimed_by_profile_id", profileId)
    .eq("status", "pending_claim");
}
