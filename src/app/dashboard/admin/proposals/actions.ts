"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

const DECISIONS = ["accepted", "declined", "countered"];

/**
 * Records an admin decision on a proposal. Phase 1 is concierge: the admin is
 * the developer's proxy. "Countered" sends it back to the realtor (with notes)
 * while keeping it open; accept/decline are terminal. Admin-only.
 */
export async function decideProposal(formData: FormData) {
  const proposalId = String(formData.get("proposal_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!proposalId) return;
  if (!DECISIONS.includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("project_proposals")
    .update({
      status,
      admin_notes: notes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  revalidatePath("/dashboard/admin/proposals");
  revalidatePath("/dashboard/admin");
}
