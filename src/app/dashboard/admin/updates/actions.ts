"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { rewardUpdateApproved } from "@/lib/rewards";

/**
 * Decides a property update request. Approval marks the request approved; the
 * actual canonical edits are applied by the admin in the project editor
 * (kept explicit so changes are reviewed, not auto-merged). Admin-only.
 */
export async function decideUpdate(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!requestId) return;
  if (!["approved", "rejected", "needs_changes"].includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  // Read the request first so we know who to reward and on which project.
  const { data: request } = await supabase
    .from("property_update_requests")
    .select("id, submitted_by_user_id, project_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!request) return;

  await supabase
    .from("property_update_requests")
    .update({
      status,
      admin_notes: notes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  // Reward an approved update: Pro days + lead stewardship that bumps any prior
  // steward on this project. Idempotent per request.
  if (status === "approved") {
    await rewardUpdateApproved(
      request.submitted_by_user_id as string,
      request.id as string,
      request.project_id as string,
    );
  }

  revalidatePath("/dashboard/admin/updates");
  revalidatePath("/dashboard/admin");
}
