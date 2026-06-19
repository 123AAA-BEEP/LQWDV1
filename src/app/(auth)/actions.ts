"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

async function originUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(redirectTo || "/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const brokerageName = String(formData.get("brokerage_name") ?? "").trim();
  const reco = String(formData.get("reco_registration_number") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const referralCode = String(formData.get("ref") ?? "").trim().toUpperCase();
  const origin = await originUrl();

  const fail = (msg: string) =>
    redirect(`/signup?error=${encodeURIComponent(msg)}`);

  if (!firstName || !lastName) fail("First and last name are required.");
  if (!email) fail("Email is required.");
  if (!phone) fail("Phone number is required.");
  if (!brokerageName) fail("Brokerage is required.");
  if (!reco) fail("RECO registration number is required.");
  if (!["sales_representative", "broker", "broker_of_record"].includes(title)) {
    fail("Please select your title.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      // Carried on the auth user so the profile can be populated on first
      // dashboard load, even when email confirmation is enabled (no session
      // exists at signup time to write directly to the profiles table).
      data: {
        first_name: firstName,
        last_name: lastName,
        phone,
        brokerage_name: brokerageName,
        reco_registration_number: reco,
        title,
        // Referrer's code, carried until the profile is created on first load.
        referral_code_used: referralCode || null,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is disabled, a session exists immediately.
  if (data.session) {
    redirect("/dashboard");
  }
  redirect("/login?message=check-email");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const origin = await originUrl();

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Always report success to avoid leaking which emails exist.
  redirect("/forgot-password?message=sent");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}
