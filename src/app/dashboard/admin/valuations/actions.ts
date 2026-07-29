"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";

const STATUSES = ["new", "contacted", "qualified", "closed", "spam"];

/** Moves a home-value request through its pipeline (admin-only). */
export async function setValuationStatus(formData: FormData) {
  const id = String(formData.get("request_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  const { error } = await supabase
    .from("valuation_requests")
    .update({ status })
    .eq("id", id);

  revalidatePath("/dashboard/admin/valuations");
  if (error) {
    redirectWithFlash(
      "/dashboard/admin/valuations",
      `Couldn't update: ${error.message}`,
      "error",
    );
  }
  redirectWithFlash("/dashboard/admin/valuations", `Marked ${status}.`);
}
