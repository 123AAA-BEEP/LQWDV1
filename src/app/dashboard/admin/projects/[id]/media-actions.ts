"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { pathFromPublicUrl } from "@/lib/upload";

const editorPath = (id: string) => `/dashboard/admin/projects/${id}`;

/*
 * Files are uploaded DIRECTLY from the browser to Supabase Storage (see
 * uploads.tsx) to avoid Vercel's 4.5 MB Server Action body limit. These
 * actions only record the resulting storage path/URL in the database, and
 * re-check admin authorization server-side. Storage RLS independently
 * restricts who may write to these buckets.
 */

/* ----------------------------- Project media ---------------------------- */

export async function recordProjectMedia(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!projectId || !path) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const {
    data: { publicUrl },
  } = supabase.storage.from("project-media").getPublicUrl(path);

  await supabase.from("project_media").insert({
    project_id: projectId,
    media_type: "image",
    url: publicUrl,
    alt_text: String(formData.get("alt_text") ?? "") || null,
    is_public: true,
  });

  revalidatePath(editorPath(projectId));
}

export async function deleteProjectMedia(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const mediaId = String(formData.get("media_id") ?? "");
  if (!projectId || !mediaId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: row } = await supabase
    .from("project_media")
    .select("url")
    .eq("id", mediaId)
    .maybeSingle();

  if (row?.url) {
    const path = pathFromPublicUrl(row.url, "project-media");
    if (path) await supabase.storage.from("project-media").remove([path]);
  }

  await supabase.from("project_media").delete().eq("id", mediaId);
  revalidatePath(editorPath(projectId));
}

export async function setHeroImage(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const url = String(formData.get("url") ?? "");
  if (!projectId || !url) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("projects")
    .update({ hero_image_url: url })
    .eq("id", projectId);
  revalidatePath(editorPath(projectId));
}

/* ------------------------------ Floorplans ------------------------------ */

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function recordFloorplan(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const imagePath = String(formData.get("image_path") ?? "");
  const imageUrl = imagePath
    ? supabase.storage.from("project-media").getPublicUrl(imagePath).data
        .publicUrl
    : null;

  await supabase.from("project_floorplans").insert({
    project_id: projectId,
    plan_name: String(formData.get("plan_name") ?? "") || null,
    unit_type: String(formData.get("unit_type") ?? "") || null,
    sqft_interior: numOrNull(formData.get("sqft_interior")),
    price_public: numOrNull(formData.get("price_public")),
    floorplan_image_url: imageUrl,
  });

  revalidatePath(editorPath(projectId));
}

export async function deleteFloorplan(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const floorplanId = String(formData.get("floorplan_id") ?? "");
  if (!projectId || !floorplanId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: row } = await supabase
    .from("project_floorplans")
    .select("floorplan_image_url")
    .eq("id", floorplanId)
    .maybeSingle();

  if (row?.floorplan_image_url) {
    const path = pathFromPublicUrl(row.floorplan_image_url, "project-media");
    if (path) await supabase.storage.from("project-media").remove([path]);
  }

  await supabase.from("project_floorplans").delete().eq("id", floorplanId);
  revalidatePath(editorPath(projectId));
}

/* ------------------------------ Documents ------------------------------- */
// PRIVATE bucket `project-documents`. Stores the storage PATH (not a public
// URL). Read access is via short-lived signed URLs for authorized users only.

export async function recordDocument(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const documentType = String(formData.get("document_type") ?? "brochure").trim();
  const path = String(formData.get("path") ?? "");
  if (!projectId || !path || !title) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase.from("project_documents").insert({
    project_id: projectId,
    document_type: documentType || "brochure",
    title,
    file_url: path, // storage path, never a public URL
    is_public: false,
    source_type: "upload",
    uploaded_by_user_id: adminId,
  });

  revalidatePath(editorPath(projectId));
}

/**
 * Flips a document between private (broker/admin only, the default) and
 * public. Public documents are listed on the project's public page and served
 * through /projects/[slug]/docs/[id], which mints a short-lived signed URL per
 * request — the bucket itself stays private, so flipping back to private cuts
 * off public access immediately.
 */
export async function setDocumentVisibility(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const makePublic = String(formData.get("make_public") ?? "") === "1";
  if (!projectId || !documentId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  await supabase
    .from("project_documents")
    .update({ is_public: makePublic })
    .eq("id", documentId);

  revalidatePath(editorPath(projectId));
}

export async function deleteDocument(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const documentId = String(formData.get("document_id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!projectId || !documentId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  if (path) await supabase.storage.from("project-documents").remove([path]);
  await supabase.from("project_documents").delete().eq("id", documentId);
  revalidatePath(editorPath(projectId));
}
