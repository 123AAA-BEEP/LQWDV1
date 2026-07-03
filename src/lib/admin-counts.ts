import { createClient } from "@/lib/supabase/server";

/**
 * Pending-work counts per admin queue, keyed by the queue's route. Feeds the
 * admin nav badges and the Overview cards so both always agree.
 */
export interface AdminQueueCounts {
  [href: string]: number;
}

async function countWhere(
  table: string,
  column: string,
  values: string[],
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .in(column, values);
  return count ?? 0;
}

export async function getAdminQueueCounts(): Promise<AdminQueueCounts> {
  const [
    leads,
    invites,
    verifications,
    submissions,
    updates,
    proposals,
    rfps,
    referrals,
    media,
    suggestions,
    intakeErrors,
    discoverySignals,
  ] = await Promise.all([
    countWhere("project_leads", "status", ["new"]),
    countWhere("off_market_invites", "status", ["draft"]),
    countWhere("verification_requests", "status", ["pending"]),
    countWhere("property_submissions", "status", [
      "pending_review",
      "needs_changes",
    ]),
    countWhere("property_update_requests", "status", [
      "pending_review",
      "needs_changes",
    ]),
    countWhere("project_proposals", "status", ["submitted", "under_review"]),
    countWhere("deal_rfp_proposals", "status", ["submitted"]),
    countWhere("rental_referrals", "status", ["new", "received", "in_progress"]),
    countWhere("project_media_candidates", "status", ["pending"]),
    countWhere("platform_suggestions", "status", ["new"]),
    countWhere("email_intake_log", "action", ["error"]),
    countWhere("discovery_signals", "status", ["new", "error"]),
  ]);

  return {
    "/dashboard/admin/leads": leads,
    "/dashboard/admin/invites": invites,
    "/dashboard/admin/verifications": verifications,
    "/dashboard/admin/submissions": submissions,
    "/dashboard/admin/updates": updates,
    "/dashboard/admin/proposals": proposals,
    "/dashboard/admin/rfps": rfps,
    "/dashboard/admin/referrals": referrals,
    "/dashboard/admin/media-candidates": media,
    "/dashboard/admin/suggestions": suggestions,
    "/dashboard/admin/email-intake": intakeErrors,
    "/dashboard/admin/discovery": discoverySignals,
  };
}
