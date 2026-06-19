"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

const STATUSES = [
  "new",
  "under_review",
  "planned",
  "in_progress",
  "shipped",
  "declined",
];

/**
 * Triage a platform suggestion (admin-only): move it through the status pipeline
 * and optionally write a public response shown back to the realtor who submitted
 * it, plus an internal admin note.
 */
export async function setSuggestionStatus(formData: FormData) {
  const id = String(formData.get("suggestion_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const publicResponse = String(formData.get("public_response") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  if (!id || !STATUSES.includes(status)) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("platform_suggestions")
    .update({
      status,
      public_response: publicResponse || null,
      admin_notes: adminNotes || null,
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/dashboard/admin/suggestions");
  revalidatePath("/dashboard/admin");
}
