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
  const bio_short = String(formData.get("bio_short") ?? "").trim().slice(0, 600);
  const service_area = String(formData.get("service_area") ?? "").trim().slice(0, 200);
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
      bio_short: bio_short || null,
      service_area: service_area || null,
      is_public_profile_enabled: is_public,
    })
    .eq("id", user.id);

  if (error) {
    redirect("/dashboard/profile?error=" + encodeURIComponent("Could not save changes."));
  }
  redirect("/dashboard/profile?message=saved");
}

export async function changeEmail(formData: FormData) {
  const newEmail = String(formData.get("new_email") ?? "").trim().toLowerCase();
  if (!newEmail) {
    redirect("/dashboard/profile?error=" + encodeURIComponent("Email address is required."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (newEmail === user.email) {
    redirect("/dashboard/profile?error=" + encodeURIComponent("That is already your email address."));
  }

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/dashboard/profile` },
  );

  if (error) {
    redirect("/dashboard/profile?error=" + encodeURIComponent("Could not send confirmation email. Please try again."));
  }

  redirect("/dashboard/profile?message=email-change-pending");
}
