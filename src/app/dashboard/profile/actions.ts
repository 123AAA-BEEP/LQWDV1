"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Updates the current user's own profile. RLS restricts updates to the owner,
 * and a DB trigger blocks any change to role / verification_status by
 * non-admins, so those are never sent here.
 */
export async function updateProfile(formData: FormData) {
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const brokerage_name = String(formData.get("brokerage_name") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const is_public = formData.get("is_public_profile_enabled") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: first_name || null,
      last_name: last_name || null,
      phone: phone || null,
      brokerage_name: brokerage_name || null,
      title: title || null,
      is_public_profile_enabled: is_public,
    })
    .eq("id", user.id);

  if (error) {
    redirect("/dashboard/profile?error=" + encodeURIComponent("Could not save changes."));
  }
  redirect("/dashboard/profile?message=saved");
}
