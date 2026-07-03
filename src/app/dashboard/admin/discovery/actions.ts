"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { igniteSignal } from "@/lib/discovery/go";
import type { SignalRow } from "@/lib/discovery/match";
import { redirectWithFlash } from "@/lib/flash";

/** Manually ignite one signal from the Discovery queue (admin-only). */
export async function igniteSignalAction(formData: FormData) {
  const id = String(formData.get("signal_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await assertAdmin(supabase);

  const admin = createAdminClient();
  const { data } = await admin
    .from("discovery_signals")
    .select(
      "id, source, source_url, project_name, builder_name, address_full, city, raw, status, matched_watch_id, project_id",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return;

  const outcome = await igniteSignal(admin, data as SignalRow);
  revalidatePath("/dashboard/admin/discovery");
  redirectWithFlash(
    "/dashboard/admin/discovery",
    outcome.published
      ? `Published “${(data as SignalRow).project_name}” — live with SEO + IndexNow.`
      : `“${(data as SignalRow).project_name}”: ${outcome.notes}`,
    outcome.published ? "success" : "info",
  );
}

/** Hide a signal that isn't a real project (admin-only). */
export async function dismissSignal(formData: FormData) {
  const id = String(formData.get("signal_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("discovery_signals")
    .update({ status: "dismissed" })
    .eq("id", id);
  revalidatePath("/dashboard/admin/discovery");
}

/** Stop watching an application that isn't lead-worthy (admin-only). */
export async function dismissWatch(formData: FormData) {
  const id = String(formData.get("watch_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("discovery_watch")
    .update({ status: "dismissed" })
    .eq("id", id);
  revalidatePath("/dashboard/admin/discovery");
}
