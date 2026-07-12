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
