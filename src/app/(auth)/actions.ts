"use server";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { safeRelativePath } from "@/lib/safe-redirect";

async function originUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Open-redirect guard: only ever honour an in-app relative path.
  const redirectTo = safeRelativePath(formData.get("redirect"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Three-field signup (ad landing, 2026-09): a single "Full name" is split
  // on the last space. The older two-field form still works unchanged.
  const fullName = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ");
  const splitAt = fullName.lastIndexOf(" ");
  const firstName =
    String(formData.get("first_name") ?? "").trim() ||
    (splitAt > 0 ? fullName.slice(0, splitAt) : fullName);
  const lastName =
    String(formData.get("last_name") ?? "").trim() ||
    (splitAt > 0 ? fullName.slice(splitAt + 1) : "");
  // Everything below is OPTIONAL at signup now: the RECO certificate upload
  // on the very next screen supplies the registration number and expiry, and
  // brokerage / phone / title are collected on the profile. Fewer fields
  // between an ad click and an account; nothing lost — verification still
  // requires the certificate or a manual review.
  const phone = String(formData.get("phone") ?? "").trim();
  const brokerageName = String(formData.get("brokerage_name") ?? "").trim();
  const reco = String(formData.get("reco_registration_number") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const referralCode = String(formData.get("ref") ?? "").trim().toUpperCase();
  // Open-redirect guard: only ever honour an in-app relative path.
  const next = safeRelativePath(formData.get("next"));
  const origin = await originUrl();

  const fail = (msg: string) =>
    redirect(`/signup?error=${encodeURIComponent(msg)}`);

  if (!firstName || !lastName) fail("Please enter your first and last name.");
  if (!email) fail("Email is required.");
  if (title && !["sales_representative", "broker", "broker_of_record"].includes(title)) {
    fail("Please select your title.");
  }

  // First-touch ad attribution captured by the proxy (liqwd_attr, httpOnly).
  // Carried as auth metadata so it survives email confirmation, then stamped
  // on the profile at bootstrap (migration 0103). Never anything personal.
  let attribution: Record<string, unknown> | null = null;
  try {
    const raw = (await cookies()).get("liqwd_attr")?.value;
    if (raw && raw.length <= 2000) {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object") attribution = parsed as Record<string, unknown>;
    }
  } catch {
    attribution = null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      // Carried on the auth user so the profile can be populated on first
      // dashboard load, even when email confirmation is enabled (no session
      // exists at signup time to write directly to the profiles table).
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        brokerage_name: brokerageName || null,
        reco_registration_number: reco || null,
        title: title || null,
        // Referrer's code, carried until the profile is created on first load.
        referral_code_used: referralCode || null,
        attribution,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is disabled, a session exists immediately.
  if (data.session) {
    redirect(next);
  }
  // Carry the destination so a manual login from the check-email screen still
  // lands where the signup was headed; claim flows get claim-aware guidance.
  const params = new URLSearchParams({ message: "check-email" });
  if (next.startsWith("/claim/")) params.set("claim", "1");
  if (next !== "/dashboard") params.set("redirect", next);
  redirect(`/login?${params.toString()}`);
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
