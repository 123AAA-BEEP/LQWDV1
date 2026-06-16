"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Three-state similar-properties override: "show" | "hide" | "" (auto). */
function triState(v: FormDataEntryValue | null): boolean | null {
  const s = String(v ?? "");
  if (s === "show") return true;
  if (s === "hide") return false;
  return null;
}

/** Edits canonical project fields (admin-only). */
export async function updateProject(formData: FormData) {
  const id = String(formData.get("project_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("projects")
    .update({
      project_name: str(formData.get("project_name")) ?? "Untitled",
      builder_name: str(formData.get("builder_name")),
      city: str(formData.get("city")) ?? "Unknown",
      description_short: str(formData.get("description_short")),
      description_long: str(formData.get("description_long")),
      sales_status: str(formData.get("sales_status")),
      construction_status: str(formData.get("construction_status")),
      occupancy_estimate_text: str(formData.get("occupancy_estimate_text")),
      price_from_public: num(formData.get("price_from_public")),
      price_to_public: num(formData.get("price_to_public")),
      hero_image_url: str(formData.get("hero_image_url")),
      record_status: str(formData.get("record_status")) ?? "draft",
      is_advertiser: formData.get("is_advertiser") === "on",
      show_similar_override: triState(formData.get("show_similar_override")),
    })
    .eq("id", id);

  revalidatePath(`/dashboard/admin/projects/${id}`);
  revalidatePath("/dashboard/admin/projects");
}

/** Creates/updates the public publishing layer for a project (admin-only). */
export async function savePublicPage(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const slug = str(formData.get("slug"));
  if (!projectId || !slug) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase.from("public_project_pages").upsert(
    {
      project_id: projectId,
      slug,
      seo_title: str(formData.get("seo_title")),
      seo_meta_description: str(formData.get("seo_meta_description")),
      page_summary: str(formData.get("page_summary")),
      page_description: str(formData.get("page_description")),
      indexable: formData.get("indexable") === "on",
    },
    { onConflict: "project_id" },
  );

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
}

/**
 * Publishes the public project page. Sets all three flags the public view
 * requires: projects.public_page_enabled + record_status='published' and
 * public_project_pages.is_active. Admin-only.
 */
export async function publishProject(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const now = new Date().toISOString();

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return;

  const { data: page } = await supabase
    .from("public_project_pages")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (page) {
    await supabase
      .from("public_project_pages")
      .update({ is_active: true, published_at: now })
      .eq("project_id", projectId);
  } else {
    await supabase.from("public_project_pages").insert({
      project_id: projectId,
      slug: project.slug,
      is_active: true,
      published_at: now,
    });
  }

  await supabase
    .from("projects")
    .update({
      public_page_enabled: true,
      record_status: "published",
      published_at: now,
    })
    .eq("id", projectId);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/admin/projects");
}

/** Unpublishes the public page (removes it from the public view). Admin-only. */
export async function unpublishProject(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("public_project_pages")
    .update({ is_active: false })
    .eq("project_id", projectId);

  await supabase
    .from("projects")
    .update({ public_page_enabled: false })
    .eq("id", projectId);

  revalidatePath(`/dashboard/admin/projects/${projectId}`);
  revalidatePath("/dashboard/admin/projects");
}
