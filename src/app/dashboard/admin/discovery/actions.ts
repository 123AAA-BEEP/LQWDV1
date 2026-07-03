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

/**
 * Bulk manual intake: paste project names (one per line, optionally
 * "Name | City" to override the default city) and each becomes a discovery
 * signal. Ignition then researches, geolocates, and publishes them through
 * the standard pipeline — built for "here's a ton of Miami project names".
 */
export async function addManualSignals(formData: FormData) {
  const rawList = String(formData.get("names") ?? "");
  const defaultCity = String(formData.get("city") ?? "").trim() || null;
  const supabase = await createClient();
  await assertAdmin(supabase);

  const admin = createAdminClient();
  const lines = rawList
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && l.length <= 140)
    .slice(0, 200);

  let added = 0;
  let dupes = 0;
  for (const line of lines) {
    const [name, cityOverride] = line.split("|").map((s) => s.trim());
    if (!name) continue;
    const { error } = await admin.from("discovery_signals").insert({
      source: "manual",
      project_name: name,
      city: cityOverride || defaultCity,
    });
    if (error) {
      if (/duplicate key/i.test(error.message)) dupes++;
    } else {
      added++;
    }
  }

  revalidatePath("/dashboard/admin/discovery");
  redirectWithFlash(
    "/dashboard/admin/discovery",
    `${added} signal${added === 1 ? "" : "s"} queued${
      dupes ? ` (${dupes} duplicate${dupes === 1 ? "" : "s"} skipped)` : ""
    } — run the sweep runner or Ignite them individually; each gets researched, geolocated, and published when geography confirms.`,
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
