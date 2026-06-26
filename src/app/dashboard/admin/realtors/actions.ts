"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

/**
 * Sets a realtor's tier ('standard' | 'ultra'). Ultra is the invitation-only
 * gate into the Deal Desk. Admin-only: the profile escalation guard (migration
 * 0005) blocks non-admins from changing realtor_tier even if RLS let them.
 */
export async function setRealtorTier(formData: FormData) {
  const profileId = String(formData.get("profile_id") ?? "");
  const tier = String(formData.get("tier") ?? "");

  if (!profileId) return;
  if (!["standard", "ultra"].includes(tier)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("profiles")
    .update({ realtor_tier: tier })
    .eq("id", profileId)
    .eq("role", "realtor");

  revalidatePath("/dashboard/admin/realtors");
  // Refresh the per-realtor detail view too (the toggle is offered there).
  revalidatePath("/dashboard/admin/realtors/[id]", "page");
}
