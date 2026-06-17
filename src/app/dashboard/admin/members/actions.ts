"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import type { Tier } from "@/lib/types";

/**
 * Hand-picks (or revokes) a member's Ultra tier. Admin-only — the guard trigger
 * permits the tier change because is_admin() is true for this session.
 *
 * Note: this is the manual / comped path. Paid Ultra is driven by Stripe
 * webhooks. Revoking a member who has an active Stripe subscription will be
 * re-granted on the next subscription event — cancel in Stripe for paid members.
 */
export async function setTier(formData: FormData) {
  const profileId = String(formData.get("profile_id") ?? "");
  const tier = String(formData.get("tier") ?? "") as Tier;

  if (!profileId) return;
  if (!["free", "ultra"].includes(tier)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase.from("profiles").update({ tier }).eq("id", profileId);

  revalidatePath("/dashboard/admin/members");
}
