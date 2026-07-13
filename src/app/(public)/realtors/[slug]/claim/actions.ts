"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUserProfile } from "@/lib/auth";

/**
 * Claims a pre-minted prospect page for the signed-in realtor.
 *
 * Race-safe (the update only wins while claimed_by is null), soft
 * identity-checked (last names must match when both are known — full identity
 * proof is the RECO verification that follows), and the page's slug transfers
 * onto the profile so the URL from the outreach email is the URL they keep.
 * Claiming a PUBLIC page is the opt-in, so the public card toggle goes on.
 */
export async function claimProspect(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) redirect("/");

  const back = (msg: string) =>
    redirect(`/realtors/${slug}/claim?error=${encodeURIComponent(msg)}`);

  const { userId, profile } = await requireUserProfile();
  if (profile.role !== "realtor") {
    back("Agent pages are for realtor accounts.");
  }

  const admin = createAdminClient();
  const { data: page } = await admin
    .from("prospect_pages")
    .select(
      "id, slug, first_name, last_name, recruit_target_id, claimed_by_profile_id, removed_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.removed_at) redirect(`/realtors/${slug}`);
  if (page.claimed_by_profile_id) {
    if (page.claimed_by_profile_id === userId) {
      redirect("/dashboard/my-page?message=page-claimed");
    }
    back("This page has already been claimed.");
  }

  const pageLast = (page.last_name ?? "").trim().toLowerCase();
  const userLast = (profile.last_name ?? "").trim().toLowerCase();
  if (pageLast && userLast && pageLast !== userLast) {
    back(
      `This page is reserved for ${[page.first_name, page.last_name].filter(Boolean).join(" ")}. ` +
        "If that's you, set your profile name to match first (Profile & settings), then try again.",
    );
  }

  const { data: won } = await admin
    .from("prospect_pages")
    .update({
      claimed_by_profile_id: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", page.id)
    .is("claimed_by_profile_id", null)
    .select("id")
    .maybeSingle();
  if (!won) back("This page has already been claimed.");

  const currentSlug = (profile as { slug?: string | null }).slug;
  if (!currentSlug) {
    // Unique-index race is survivable: the claim stands, they just keep a
    // generated slug later via ensureSlug instead of this one.
    await admin
      .from("profiles")
      .update({ slug: page.slug, is_public_profile_enabled: true })
      .eq("id", userId)
      .is("slug", null);
  } else {
    await admin
      .from("profiles")
      .update({ is_public_profile_enabled: true })
      .eq("id", userId);
  }

  // Funnel truth: a claimed page means the outreach converted.
  if (page.recruit_target_id) {
    await admin
      .from("recruit_targets")
      .update({ status: "signed_up" })
      .eq("id", page.recruit_target_id);
  }

  redirect("/dashboard/my-page?message=page-claimed");
}
