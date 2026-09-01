"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";

const QUEUE = "/dashboard/admin/playbooks/queue";

/**
 * Approve a staged playbook item. The DB trigger enforces the invariants
 * (block-severity lint can never be approved; claim-bearing types need a
 * claims manifest) — a violation surfaces as a flash error, never a silent
 * success.
 */
export async function approveItem(formData: FormData) {
  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);
  const id = String(formData.get("item_id") ?? "");
  if (!id) redirectWithFlash(QUEUE, "Missing item.", "error");

  const { error } = await supabase
    .from("approval_items")
    .update({ status: "approved", approver_profile_id: adminId })
    .eq("id", id)
    .in("status", ["staged", "triaged"]);
  revalidatePath(QUEUE);
  if (error) {
    redirectWithFlash(QUEUE, `Refused: ${error.message}`, "error");
  }
  redirectWithFlash(QUEUE, "Approved. Publishing is the playbook's next step.");
}

export async function rejectItem(formData: FormData) {
  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);
  const id = String(formData.get("item_id") ?? "");
  if (!id) redirectWithFlash(QUEUE, "Missing item.", "error");

  const { error } = await supabase
    .from("approval_items")
    .update({ status: "rejected", approver_profile_id: adminId })
    .eq("id", id)
    .in("status", ["staged", "triaged"]);
  revalidatePath(QUEUE);
  if (error) {
    redirectWithFlash(QUEUE, `Refused: ${error.message}`, "error");
  }
  redirectWithFlash(QUEUE, "Rejected — the draft stays on record, unpublished.");
}
