"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 * Claims a sourced listing for the logged-in agent and publishes it.
 *
 * Security model: the token is the unguessable secret (sent only to the agent's
 * on-file address). We re-validate it server-side, require an authenticated
 * realtor, and only ever act on a row that is still `pending_claim`. The admin
 * (service-role) client is used because the claimer doesn't own the row yet, so
 * RLS would block the read/update — every check is enforced here in code.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect(`/login?redirect=/claim/${token}`);

  // Only real estate agents (or an admin, for testing) can claim a listing.
  if (profile.role !== "realtor" && profile.role !== "admin") {
    redirect(`/claim/${token}?error=role`);
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("off_market_listings")
    .select("id, status")
    .eq("claim_token", token)
    .maybeSingle();

  if (!listing) redirect("/claim/invalid");
  if (listing.status !== "pending_claim") {
    // Already claimed (or archived) — show the listing's current state.
    redirect(`/claim/${token}`);
  }

  const { error } = await admin
    .from("off_market_listings")
    .update({
      realtor_id: user.id,
      claimed_by_profile_id: user.id,
      claimed_at: new Date().toISOString(),
      status: "published",
      ...contactSnapshot(profile as Profile, user.email ?? null),
    })
    .eq("id", listing.id)
    .eq("status", "pending_claim"); // guard against a concurrent claim

  if (error) redirect(`/claim/${token}?error=save`);

  redirect(`/claim/${token}?done=1`);
}
