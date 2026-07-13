"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUserProfile } from "@/lib/auth";
import { hasActivePro } from "@/lib/types";
import { plainSlug } from "@/lib/slug";

/**
 * "My public page" management. Tier rule (the freemium mechanic): FREE agents
 * pick up to FREE_PICK_LIMIT projects for their page (and the page carries
 * LIQWD-curated placements for their market); PRO agents pick unlimited and
 * their page renders only their own picks.
 */

// Kept in sync with FREE_PICK_LIMIT in page.tsx ("use server" files may only
// export async functions, so the constant can't be exported from here).
const FREE_PICK_LIMIT = 3;

// Self-reported awards cap — a page, not a trophy warehouse.
const AWARD_LIMIT = 10;

// Custom link-in-bio links cap — kept in sync with page.tsx.
const LINK_LIMIT = 8;

const MY_PAGE = "/dashboard/my-page";

function fail(message: string): never {
  redirect(`${MY_PAGE}?error=${encodeURIComponent(message)}`);
}

function hasFullCustomization(profile: {
  plan: string;
  realtor_tier: string;
  pro_until: string | null;
}): boolean {
  return (
    profile.plan === "pro" ||
    profile.plan === "ultra" ||
    profile.realtor_tier === "pro" ||
    profile.realtor_tier === "ultra" ||
    hasActivePro(profile)
  );
}

/** Generates and stores the agent's public slug if missing (collision-safe). */
export async function ensureSlug(): Promise<void> {
  const { profile } = await requireUserProfile();
  if (profile.role !== "realtor" || profile.verification_status !== "approved") return;
  const current = (profile as { slug?: string | null }).slug;
  if (current) return;

  const base =
    plainSlug([profile.first_name, profile.last_name].filter(Boolean).join(" ")) ||
    `agent-${profile.id.slice(0, 6)}`;
  const supabase = await createClient();

  // Try the clean slug first; on unique collision, append an id fragment.
  const { error } = await supabase
    .from("profiles")
    .update({ slug: base })
    .eq("id", profile.id);
  if (error) {
    await supabase
      .from("profiles")
      .update({ slug: `${base}-${profile.id.replace(/-/g, "").slice(0, 4)}` })
      .eq("id", profile.id);
  }
}

export async function addPagePick(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  if (!project_id) redirect("/dashboard/my-page");

  const { profile } = await requireUserProfile();
  const supabase = await createClient();

  if (!hasFullCustomization(profile)) {
    const { count } = await supabase
      .from("realtor_page_projects")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id);
    if ((count ?? 0) >= FREE_PICK_LIMIT) {
      redirect(
        "/dashboard/my-page?error=" +
          encodeURIComponent(
            `Free pages include ${FREE_PICK_LIMIT} projects of your choice. Upgrade to Pro for unlimited.`,
          ),
      );
    }
  }

  await supabase.from("realtor_page_projects").insert({
    profile_id: profile.id,
    project_id,
  });
  revalidatePath("/dashboard/my-page");
  redirect("/dashboard/my-page?message=added");
}

export async function removePagePick(formData: FormData) {
  const id = String(formData.get("pick_id") ?? "");
  if (!id) redirect("/dashboard/my-page");
  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  await supabase
    .from("realtor_page_projects")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  revalidatePath("/dashboard/my-page");
  redirect("/dashboard/my-page?message=removed");
}

/** Adds a self-reported award ("Top Producer 2024", brokerage awards, …). */
export async function addAward(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const issuer =
    String(formData.get("issuer") ?? "").trim().slice(0, 120) || null;
  const yearRaw = String(formData.get("year") ?? "").trim();
  const year = yearRaw ? Number(yearRaw) : null;

  if (!title) fail("Give the award a name.");
  if (year !== null && (!Number.isInteger(year) || year < 1950 || year > 2100)) {
    fail("Enter a valid year (e.g. 2024).");
  }

  const { profile } = await requireUserProfile();
  if (profile.role !== "realtor") redirect("/dashboard");
  const supabase = await createClient();

  const { count } = await supabase
    .from("realtor_awards")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);
  if ((count ?? 0) >= AWARD_LIMIT) {
    fail(`You can show up to ${AWARD_LIMIT} awards. Remove one first.`);
  }

  const { error } = await supabase.from("realtor_awards").insert({
    profile_id: profile.id,
    title,
    issuer,
    year,
  });
  if (error) fail("Couldn't save that award. Please try again.");
  revalidatePath(MY_PAGE);
  redirect(`${MY_PAGE}?message=award-added`);
}

export async function removeAward(formData: FormData) {
  const id = String(formData.get("award_id") ?? "");
  if (!id) redirect(MY_PAGE);
  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  await supabase
    .from("realtor_awards")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  revalidatePath(MY_PAGE);
  redirect(`${MY_PAGE}?message=award-removed`);
}

/** Adds a custom link ("My listings", "Google reviews", their site, …). */
export async function addLink(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim().slice(0, 60);
  const url = String(formData.get("url") ?? "").trim().slice(0, 500);

  if (!label) fail("Give the link a label.");
  if (!/^https?:\/\/.+\..+/i.test(url)) {
    fail("Enter a full link starting with https://");
  }

  const { profile } = await requireUserProfile();
  if (profile.role !== "realtor") redirect("/dashboard");
  const supabase = await createClient();

  const { count } = await supabase
    .from("realtor_links")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id);
  if ((count ?? 0) >= LINK_LIMIT) {
    fail(`You can show up to ${LINK_LIMIT} links. Remove one first.`);
  }

  const { error } = await supabase.from("realtor_links").insert({
    profile_id: profile.id,
    label,
    url,
  });
  if (error) fail("Couldn't save that link. Please try again.");
  revalidatePath(MY_PAGE);
  redirect(`${MY_PAGE}?message=link-added`);
}

export async function removeLink(formData: FormData) {
  const id = String(formData.get("link_id") ?? "");
  if (!id) redirect(MY_PAGE);
  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  await supabase
    .from("realtor_links")
    .delete()
    .eq("id", id)
    .eq("profile_id", profile.id);
  revalidatePath(MY_PAGE);
  redirect(`${MY_PAGE}?message=link-removed`);
}

/** Shows/hides the system-computed medals section on the public page. */
export async function setShowAchievements(formData: FormData) {
  const next = String(formData.get("next") ?? "") === "on";
  const { profile } = await requireUserProfile();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ show_achievements: next })
    .eq("id", profile.id);
  revalidatePath(MY_PAGE);
  redirect(`${MY_PAGE}?message=${next ? "achievements-on" : "achievements-off"}`);
}
