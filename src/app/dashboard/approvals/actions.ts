"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirectWithFlash } from "@/lib/flash";

const INBOX = "/dashboard/approvals";

/**
 * A realtor deciding on their OWN staged items (agent-panel UX reorg, Phase 4).
 * RLS gives realtors read-only on approval_items by design ("decisions flow
 * through server actions"), so the write goes through the service role AFTER
 * an explicit ownership check: subject_kind = realtor and subject_id = the
 * caller. The DB trigger still enforces the invariants (block-severity lint
 * can never be approved; claim-bearing types need a claims manifest).
 */
async function decide(formData: FormData, status: "approved" | "rejected") {
  const { userId } = await requireUserProfile();
  const id = String(formData.get("item_id") ?? "");
  if (!id) redirectWithFlash(INBOX, "Missing item.", "error");

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("approval_items")
    .select("id, subject_kind, subject_id, status")
    .eq("id", id)
    .maybeSingle();
  const owned = row && row.subject_kind === "realtor" && row.subject_id === userId;
  if (!owned) redirectWithFlash(INBOX, "That item isn't yours to decide.", "error");
  if (!["staged", "triaged"].includes(row.status)) {
    redirectWithFlash(INBOX, "Already decided.", "info");
  }

  const { error } = await admin
    .from("approval_items")
    .update({ status, approver_profile_id: userId })
    .eq("id", id)
    .in("status", ["staged", "triaged"]);
  revalidatePath(INBOX);
  revalidatePath("/dashboard/marketing");
  revalidatePath("/dashboard", "layout");
  if (error) redirectWithFlash(INBOX, `Refused: ${error.message}`, "error");
  redirectWithFlash(
    INBOX,
    status === "approved"
      ? "Approved. It goes out on the tool's next run."
      : "Rejected. The draft stays on record, unpublished.",
  );
}

export async function approveOwnItem(formData: FormData) {
  return decide(formData, "approved");
}

export async function rejectOwnItem(formData: FormData) {
  return decide(formData, "rejected");
}
