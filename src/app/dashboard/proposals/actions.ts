"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Withdraws the current user's own proposal while it's still open. RLS limits
 * the update to the owner and to rows in 'submitted'/'countered' status, so a
 * decided proposal can't be withdrawn out from under the developer.
 */
export async function withdrawProposal(formData: FormData) {
  const proposalId = String(formData.get("proposal_id") ?? "");
  if (!proposalId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("project_proposals")
    .update({ status: "withdrawn" })
    .eq("id", proposalId)
    .eq("submitted_by_user_id", user.id)
    .in("status", ["submitted", "countered"]);

  revalidatePath("/dashboard/proposals");
}
