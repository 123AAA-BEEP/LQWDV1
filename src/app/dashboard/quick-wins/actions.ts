"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserProfile, isApproved } from "@/lib/auth";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/**
 * An approved realtor refers a client to a purpose-built-rental project's
 * leasing team. Client contact is captured here (full contact on submission);
 * the building's team works it and drives the status the agent sees.
 */
export async function submitRentalReferral(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const email = str(formData.get("client_email"));
  if (!projectId || !email) return;

  const { userId, profile } = await requireUserProfile();
  if (!isApproved(profile)) return;

  const supabase = await createClient();
  await supabase.from("rental_referrals").insert({
    project_id: projectId,
    referred_by_profile_id: userId,
    submitting_brokerage_id: profile.brokerage_id,
    mandate_id: str(formData.get("mandate_id")),
    client_first_name: str(formData.get("client_first_name")),
    client_last_name: str(formData.get("client_last_name")),
    client_email: email,
    client_phone: str(formData.get("client_phone")),
    message: str(formData.get("message")),
    status: "new",
  });

  revalidatePath("/dashboard/quick-wins");
  revalidatePath("/dashboard/admin/referrals");
  redirect("/dashboard/quick-wins?referred=1");
}
