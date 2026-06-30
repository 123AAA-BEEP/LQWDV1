"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { maybeGenerateSeoOnPublish } from "@/lib/seo";

// record_status values an admin may set in bulk from the Projects list.
const BULK_STATUSES = new Set(["draft", "approved", "archived"]);

// Cap inline SEO generations per bulk publish so the action stays within the
// serverless function time budget. Larger publishes fill the rest on re-run
// (idempotent) or via the per-project editor button.
const BULK_SEO_LIMIT = 8;

/**
 * Sets record_status on many projects at once (admin-only). Used by the
 * checkbox multi-select bulk bar on the admin Projects tab.
 */
export async function bulkSetProjectStatus(formData: FormData) {
  const status = String(formData.get("status") ?? "");
  const ids = formData
    .getAll("ids")
    .map((v) => String(v))
    .filter(Boolean);

  if (!BULK_STATUSES.has(status) || ids.length === 0) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("projects")
    .update({ record_status: status })
    .in("id", ids);

  revalidatePath("/dashboard/admin/projects");
}

function idsFrom(formData: FormData): string[] {
  return formData
    .getAll("ids")
    .map((v) => String(v))
    .filter(Boolean);
}

/**
 * Publishes many projects at once (admin-only). Mirrors the per-project
 * publishProject: ensures an active public_project_pages row and flips the
 * three flags the public view requires.
 */
export async function bulkPublish(formData: FormData) {
  const ids = idsFrom(formData);
  if (ids.length === 0) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  const now = new Date().toISOString();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug")
    .in("id", ids);
  const { data: pages } = await supabase
    .from("public_project_pages")
    .select("project_id")
    .in("project_id", ids);
  const havePage = new Set((pages ?? []).map((p) => p.project_id));

  const toInsert = (projects ?? [])
    .filter((p) => !havePage.has(p.id))
    .map((p) => ({
      project_id: p.id,
      slug: p.slug,
      is_active: true,
      published_at: now,
    }));
  if (toInsert.length > 0) {
    await supabase.from("public_project_pages").insert(toInsert);
  }

  const existingIds = (projects ?? [])
    .filter((p) => havePage.has(p.id))
    .map((p) => p.id);
  if (existingIds.length > 0) {
    await supabase
      .from("public_project_pages")
      .update({ is_active: true, published_at: now })
      .in("project_id", existingIds);
  }

  await supabase
    .from("projects")
    .update({
      public_page_enabled: true,
      record_status: "published",
      published_at: now,
    })
    .in("id", ids);

  revalidatePath("/dashboard/admin/projects");

  // SEO autofill is a series of slow LLM calls. Run them AFTER the response so
  // the bulk publish returns immediately. Bounded by the same budget; pages
  // that already have SEO are skipped without an AI call. Never throws.
  after(async () => {
    const adminDb = createAdminClient();
    let budget = BULK_SEO_LIMIT;
    for (const id of ids) {
      if (budget <= 0) break;
      const generated = await maybeGenerateSeoOnPublish(id, adminDb);
      if (generated) budget -= 1;
    }
    revalidatePath("/dashboard/admin/projects");
  });
}

/** Unpublishes many projects at once (admin-only). Leaves record_status as-is. */
export async function bulkUnpublish(formData: FormData) {
  const ids = idsFrom(formData);
  if (ids.length === 0) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("public_project_pages")
    .update({ is_active: false })
    .in("project_id", ids);
  await supabase
    .from("projects")
    .update({ public_page_enabled: false })
    .in("id", ids);

  revalidatePath("/dashboard/admin/projects");
}
