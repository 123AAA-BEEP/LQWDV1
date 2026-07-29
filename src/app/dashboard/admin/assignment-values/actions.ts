"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";

const STATUSES = ["new", "contacted", "qualified", "closed", "spam"];

/** Moves an assignment-valuation request through its pipeline (admin-only). */
export async function setAssignmentValuationStatus(formData: FormData) {
  const id = String(formData.get("request_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  const { error } = await supabase
    .from("assignment_valuation_requests")
    .update({ status })
    .eq("id", id);

  revalidatePath("/dashboard/admin/assignment-values");
  if (error) {
    redirectWithFlash(
      "/dashboard/admin/assignment-values",
      `Couldn't update: ${error.message}`,
      "error",
    );
  }
  redirectWithFlash("/dashboard/admin/assignment-values", `Marked ${status}.`);
}
