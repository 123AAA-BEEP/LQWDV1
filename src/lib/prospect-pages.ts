import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { plainSlug } from "@/lib/slug";

type Admin = ReturnType<typeof createAdminClient>;

export interface MintTarget {
  id: string;
  full_name: string | null;
  brokerage: string | null;
  base_city: string | null;
  region: string;
}

/** True if `slug` is already taken by a real profile OR a prospect page. */
async function slugTaken(admin: Admin, slug: string): Promise<boolean> {
  const [{ data: prof }, { data: prospect }] = await Promise.all([
    admin.from("profiles").select("id").eq("slug", slug).maybeSingle(),
    admin.from("prospect_pages").select("id").eq("slug", slug).maybeSingle(),
  ]);
  return Boolean(prof) || Boolean(prospect);
}

/**
 * Mints (or returns the existing) unclaimed prospect page for a recruit target,
 * returning its slug — or null if the target has no usable name to slugify.
 *
 * The slug is de-collided against BOTH profiles.slug and prospect_pages.slug so
 * that when the agent later claims + verifies, the very same slug can transfer
 * onto their real profile without conflict (the URL in the email is the URL
 * they keep). Only directory-grade fields are stored; the outreach email/phone
 * never touch this table.
 */
export async function ensureProspectPage(
  admin: Admin,
  target: MintTarget,
): Promise<string | null> {
  const { data: existing } = await admin
    .from("prospect_pages")
    .select("slug, removed_at")
    .eq("recruit_target_id", target.id)
    .maybeSingle();
  if (existing) {
    // A removed page stays removed — don't resurrect it, and signal "skip".
    return existing.removed_at ? null : (existing.slug as string);
  }

  const name = (target.full_name ?? "").trim();
  const base = plainSlug(name).slice(0, 60);
  if (!base) return null;

  const parts = name.split(/\s+/);
  const firstName = parts[0] || null;
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;

  // Find a free slug: clean name first, then de-collide with an id fragment.
  const idFrag = target.id.replace(/-/g, "");
  let slug = base;
  for (let attempt = 0; attempt < 6; attempt++) {
    if (!(await slugTaken(admin, slug))) break;
    slug = `${base}-${idFrag.slice(attempt * 4, attempt * 4 + 4)}`;
  }

  const { data: inserted, error } = await admin
    .from("prospect_pages")
    .insert({
      recruit_target_id: target.id,
      slug,
      first_name: firstName,
      last_name: lastName,
      brokerage: target.brokerage,
      city: target.base_city,
      region: target.region,
    })
    .select("slug")
    .maybeSingle();

  // A unique-slug race (two mints at once) — fall back to whatever now exists.
  if (error || !inserted) {
    const { data: after } = await admin
      .from("prospect_pages")
      .select("slug, removed_at")
      .eq("recruit_target_id", target.id)
      .maybeSingle();
    if (after && !after.removed_at) return after.slug as string;
    return null;
  }

  return inserted.slug as string;
}
