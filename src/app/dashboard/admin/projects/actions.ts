"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

// record_status values an admin may set in bulk from the Projects list.
const BULK_STATUSES = new Set(["draft", "approved", "archived"]);

/**
 * Sets record_status on many projects at once (admin-only). Used by the
 * checkbox multi-select bulk bar on the admin Projects tab.
 */
export async function bulkSetProjectStatus(formData: FormData) {
  const status = String(formData.get("status") ?? "");
  const ids = formData
    .getAll("ids")
    .map((v) => String(v))
    .filter(Boolean);

  if (!BULK_STATUSES.has(status) || ids.length === 0) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("projects")
    .update({ record_status: status })
    .in("id", ids);

  revalidatePath("/dashboard/admin/projects");
}
