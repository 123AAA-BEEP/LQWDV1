import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { linkReferralOnSignup } from "@/lib/rewards";
import { sendEmail, brandedEmail } from "@/lib/email";
import type { Profile } from "@/lib/types";

/**
 * Returns the current user + their profile, bootstrapping a profile row on
 * first access. The profile insert is permitted by RLS (id = auth.uid()).
 * Redirects to /login when there is no session.
 */
export async function requireUserProfile(): Promise<{
  userId: string;
  email: string | null;
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Populate from the metadata captured at signup (auth.signUp options.data).
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const str = (k: string) =>
      typeof meta[k] === "string" && meta[k] ? (meta[k] as string) : null;
    const title = str("title");
    const validTitle =
      title && ["sales_representative", "broker", "broker_of_record"].includes(title)
        ? title
        : null;

    const { data: inserted } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? null,
        role: "realtor",
        verification_status: "pending",
        first_name: str("first_name"),
        last_name: str("last_name"),
        phone: str("phone"),
        brokerage_name: str("brokerage_name"),
        reco_registration_number: str("reco_registration_number"),
        title: validTitle,
      })
      .select("*")
      .maybeSingle();

    if (inserted) {
      profile = inserted;
      // First profile load == the invited agent has a session (i.e. confirmed
      // their account). Link the referral and pay the signup reward to both
      // parties. Server-side, idempotent, and safe when no code was used.
      await linkReferralOnSignup(inserted.id, str("referral_code_used"));
      // Internal alert: a new agent just registered (pending verification).
      await notifyNewRealtorRegistration(inserted as Profile);
    } else {
      // The insert returned no row — almost always because a concurrent request
      // (the layout and page both call this on first load) won the race and
      // already created the profile. Re-fetch it instead of throwing a 500.
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = existing;
    }
  }

  if (!profile) {
    // Could not load or bootstrap a profile — send to login rather than crash.
    redirect("/login");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: profile as Profile,
  };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Internal alert when a new realtor registers — sent to the ops inbox
 * (LEADS_NOTIFY_EMAIL, default leads@getliqwd.com). Fires once, from the
 * profile-bootstrap insert (so it can't double-send on subsequent loads).
 * Fire-and-forget: sendEmail is a no-op until Resend is configured and never
 * throws, so it can't break the first-load bootstrap.
 */
async function notifyNewRealtorRegistration(p: Profile) {
  const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
  const name =
    [p.first_name, p.last_name].filter(Boolean).join(" ") || "New agent";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const rows = [
    `<strong>Name:</strong> ${escHtml(name)}`,
    p.email ? `<strong>Email:</strong> ${escHtml(p.email)}` : null,
    p.phone ? `<strong>Phone:</strong> ${escHtml(p.phone)}` : null,
    p.brokerage_name
      ? `<strong>Brokerage:</strong> ${escHtml(p.brokerage_name)}`
      : null,
    p.reco_registration_number
      ? `<strong>RECO #:</strong> ${escHtml(p.reco_registration_number)}`
      : null,
  ]
    .filter(Boolean)
    .join("<br>");

  await sendEmail({
    to,
    replyTo: p.email ?? undefined,
    subject: `New realtor sign-up: ${name}`,
    html: brandedEmail({
      heading: "New realtor registration",
      body:
        "A new agent just registered on LIQWD (pending verification)." +
        `<br><br>${rows}`,
      ctaUrl: `${base}/dashboard/admin/verifications`,
      ctaLabel: "Review in admin",
      footnote: "LIQWD internal notification.",
    }),
  });
}

export function isApproved(profile: Pick<Profile, "verification_status">) {
  return profile.verification_status === "approved";
}

export function isAdmin(profile: Pick<Profile, "role">) {
  return profile.role === "admin";
}

/**
 * Ultra = the paid top tier ($19.99/mo) → unlocks Deal Desk. Realtors buy it
 * via Stripe (plan = 'ultra'); admins may also comp it via realtor_tier = 'ultra'
 * (the override the Realtors admin tab still controls). Either path, plus an
 * approved verification, grants access.
 */
export function isUltra(
  profile: Pick<Profile, "verification_status" | "realtor_tier" | "plan">,
) {
  return (
    profile.verification_status === "approved" &&
    (profile.plan === "ultra" || profile.realtor_tier === "ultra")
  );
}

/**
 * Pro = paid tooling tier ($9.99/mo). Ultra is the higher paid tier and
 * includes everything in Pro, so Ultra members are Pro too.
 */
export function isPro(profile: Pick<Profile, "plan">) {
  return profile.plan === "pro" || profile.plan === "ultra";
}

/** Developer accounts (the inventory / deal side). */
export function isDeveloper(profile: Pick<Profile, "role">) {
  return profile.role === "developer";
}

/**
 * Whether a developer may request a connect on a mandate — entitlement seam.
 * True with an active access subscription OR remaining à la carte credits.
 * (Pricing-agnostic: Stripe flips these fields; the mechanic just reads them.)
 */
export function developerCanConnect(
  profile: Pick<
    Profile,
    "role" | "developer_mandate_access" | "mandate_connect_credits"
  >,
) {
  return (
    profile.role === "developer" &&
    (profile.developer_mandate_access || profile.mandate_connect_credits > 0)
  );
}
