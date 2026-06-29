"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

/**
 * Undo for an auto-published email-intake project: pulls it off the public site
 * (deactivates its page, flips it back to draft) without deleting the record, so
 * an admin can fix and re-publish. Admin-only.
 */
export async function unpublishIntakeProject(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("public_project_pages")
    .update({ is_active: false })
    .eq("project_id", projectId);
  await supabase
    .from("projects")
    .update({ public_page_enabled: false, record_status: "draft" })
    .eq("id", projectId);

  revalidatePath("/dashboard/admin/email-intake");
}
