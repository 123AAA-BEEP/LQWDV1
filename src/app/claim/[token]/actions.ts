"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile, isAdmin, isApproved } from "@/lib/auth";
import { TITLE_LABELS, type Profile } from "@/lib/types";

/** UUID v4-ish shape guard so we never run a wildcard query on garbage. */
function isToken(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

function contactSnapshot(profile: Profile, email: string | null) {
  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
    null;
  const title =
    profile.title && profile.title in TITLE_LABELS
      ? TITLE_LABELS[profile.title as keyof typeof TITLE_LABELS]
      : null;
  return {
    realtor_name: name,
    realtor_title: title,
    brokerage_name: profile.brokerage_name ?? null,
    contact_phone: profile.phone ?? null,
    contact_email: email ?? profile.email ?? null,
    claim_email: email ?? profile.email ?? null,
  };
}

/**
 * Claims a sourced listing for the logged-in agent.
 *
 * Security model: the token is the unguessable, single-use secret (sent only to
 * the agent's on-file address). We re-validate it server-side, bootstrap +
 * require an authenticated agent, and only ever act on a row that is still
 * UNCLAIMED. An approved agent's listing goes live immediately; an unverified
 * agent claims it into a held (still-dark) state that publishes when their RECO
 * verification is approved. The token is nulled on claim so a forwarded link
 * can't resolve again. The admin (service-role) client is used because the
 * claimer doesn't own the row yet — every check is enforced here in code.
 */
export async function claimListing(formData: FormData) {
  const token = formData.get("token");
  if (!isToken(token)) redirect("/claim/invalid");

  // Must be signed in. (Logged-out users are routed to signup/login first.)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/claim/${token}`);

  // Bootstrap the profile if this is their first authenticated action (the
  // claim flow can land a brand-new agent here before they ever hit /dashboard).
  const profile = await ensureProfile(supabase, user);
  if (!profile) redirect(`/login?redirect=/claim/${token}`);

  // Only real estate agents (or an admin, for testing) can claim a listing.
  if (profile.role !== "realtor" && !isAdmin(profile)) {
    redirect(`/claim/${token}?error=role`);
  }
  // Approved agents (and admins) publish immediately; unverified agents are
  // held dark until an admin approves their verification.
  const approved = isAdmin(profile) || isApproved(profile);

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("off_market_listings")
    .select("id, claimed_by_profile_id")
    .eq("claim_token", token)
    .maybeSingle();

  if (!listing) redirect("/claim/invalid");
  if (listing.claimed_by_profile_id) redirect("/claim/invalid"); // already claimed

  const { error } = await admin
    .from("off_market_listings")
    .update({
      realtor_id: user.id,
      claimed_by_profile_id: user.id,
      claimed_at: new Date().toISOString(),
      status: approved ? "published" : "pending_claim",
      claim_token: null, // single-use: the link can't resolve again
      ...contactSnapshot(profile as Profile, user.email ?? null),
    })
    .eq("id", listing.id)
    .is("claimed_by_profile_id", null); // guard against a concurrent claim

  if (error) redirect(`/claim/${token}?error=save`);

  redirect(approved ? "/claim/done" : "/claim/done?held=1");
}
