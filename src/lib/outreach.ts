import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Shared throttle for ALL cold outreach (recruit waves + lead-triggered
 * blasts). Both machines stamp recruit_targets.last_emailed_at on every
 * successful send, so one count is the whole-domain cold volume — the thing
 * mailbox providers actually score. One budget, spent by whichever machine
 * runs first; lead-triggered sends win by running on a tighter cron.
 *
 * 50/day is the steady-state ceiling for the dedicated outreach domain.
 * While the domain is brand new, run below it (arm crons at lower limits)
 * and let this cap be the hard stop, not the target.
 */
export const OUTREACH_DAILY_CAP = 50;

/** Cold-outreach emails sent in the last rolling 24h, across all campaigns. */
export async function outreachSentLast24h(admin: Admin): Promise<number> {
  const { count } = await admin
    .from("recruit_targets")
    .select("id", { count: "exact", head: true })
    .gte("last_emailed_at", new Date(Date.now() - 86_400_000).toISOString());
  return count ?? 0;
}
