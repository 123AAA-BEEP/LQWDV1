"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { redirectWithFlash } from "@/lib/flash";

const STATUSES = ["new", "contacted", "qualified", "closed", "spam"];

/** Moves an agent-match request through its pipeline (admin-only). */
export async function setMatchStatus(formData: FormData) {
  const id = String(formData.get("request_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  const { error } = await supabase
    .from("match_requests")
    .update({ status })
    .eq("id", id);

  revalidatePath("/dashboard/admin/matches");
  if (error) {
    redirectWithFlash(
      "/dashboard/admin/matches",
      `Couldn't update: ${error.message}`,
      "error",
    );
  }
  redirectWithFlash("/dashboard/admin/matches", `Marked ${status}.`);
}
