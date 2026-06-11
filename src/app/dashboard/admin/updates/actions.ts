"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

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

  await supabase
    .from("property_update_requests")
    .update({
      status,
      admin_notes: notes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  revalidatePath("/dashboard/admin/updates");
  revalidatePath("/dashboard/admin");
}
