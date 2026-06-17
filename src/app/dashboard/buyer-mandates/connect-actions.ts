"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  requireUserProfile,
  isDeveloper,
  developerCanConnect,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Developer requests an intro on a mandate. Gated by the entitlement seam. */
export async function requestConnect(formData: FormData) {
  const { userId, profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard/buyer-mandates");

  const mandateId = String(formData.get("mandate_id") ?? "");
  if (!mandateId) return;
  if (!developerCanConnect(profile)) redirect("/dashboard/developer");

  const message = String(formData.get("message") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("mandate_connect_requests").insert({
    mandate_id: mandateId,
    developer_user_id: userId,
    message,
  });
  if (error) {
    // Unique violation = already requested; treat as a no-op.
    redirect("/dashboard/buyer-mandates?connect=exists");
  }

  // À la carte: consume one credit unless the developer has a subscription.
  if (!profile.developer_mandate_access) {
    await createAdminClient()
      .from("profiles")
      .update({
        mandate_connect_credits: Math.max(0, profile.mandate_connect_credits - 1),
      })
      .eq("id", userId);
  }

  revalidatePath("/dashboard/buyer-mandates");
  redirect("/dashboard/buyer-mandates?connect=sent");
}

/** Broker (mandate owner) accepts or declines a connect request. */
export async function respondToConnect(formData: FormData) {
  await requireUserProfile();
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const mandateId = String(formData.get("mandate_id") ?? "");
  if (!requestId || !["accepted", "declined"].includes(decision)) return;

  const supabase = await createClient();
  // RLS permits only the mandate's broker (or admin). Only act on open requests.
  await supabase
    .from("mandate_connect_requests")
    .update({ status: decision, responded_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "requested");

  if (mandateId) revalidatePath(`/dashboard/buyer-mandates/${mandateId}`);
}

/** Developer withdraws their own pending request. */
export async function withdrawConnect(formData: FormData) {
  const { userId } = await requireUserProfile();
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;

  const supabase = await createClient();
  await supabase
    .from("mandate_connect_requests")
    .update({ status: "withdrawn" })
    .eq("id", requestId)
    .eq("developer_user_id", userId)
    .eq("status", "requested");

  revalidatePath("/dashboard/buyer-mandates");
}
