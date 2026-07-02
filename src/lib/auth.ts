import { redirect } from "next/navigation";
import { after } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { linkReferralOnSignup } from "@/lib/rewards";
import { sendEmail, brandedEmail } from "@/lib/email";
import type { Profile } from "@/lib/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Returns the signed-in user's profile, creating it on first access from the
 * metadata captured at signup. Race-safe. Returns null only if the row can't be
 * loaded or created. Use this anywhere a logged-in user might land *before* the
 * dashboard (e.g. the /claim flow) — profiles are otherwise never bootstrapped.
 * The insert is permitted by RLS (id = auth.uid()).
 */
export async function ensureProfile(
  supabase: SupabaseServerClient,
  user: User,
): Promise<Profile | null> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing as Profile;

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
    // First profile load == the invited agent has a session (i.e. confirmed
    // their account). Link the referral + fire the internal alert AFTER the
    // response — neither should delay the user's first page render (the claim
    // page bootstraps profiles inline). Both are idempotent / fire-and-forget.
    const referralCode = str("referral_code_used");
    after(async () => {
      await linkReferralOnSignup(inserted.id, referralCode);
      await notifyNewRealtorRegistration(inserted as Profile);
    });
    return inserted as Profile;
  }

  // The insert returned no row — almost always because a concurrent request
  // won the race and already created the profile. Re-fetch instead of failing.
  const { data: raced } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (raced as Profile | null) ?? null;
}

/**
 * Returns the current user + their profile, bootstrapping a profile row on
 * first access. Redirects to /login when there is no session.
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

  const profile = await ensureProfile(supabase, user);
  if (!profile) {
    // Could not load or bootstrap a profile — send to login rather than crash.
    redirect("/login");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    profile,
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
