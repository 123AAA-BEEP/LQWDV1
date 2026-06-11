"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import {
  validateUpload,
  extFor,
  safeName,
  pathFromPublicUrl,
  IMAGE_MIME,
  DOC_MIME,
  MEDIA_MAX,
  DOC_MAX,
} from "@/lib/upload";

const editorPath = (id: string) => `/dashboard/admin/projects/${id}`;

/* ----------------------------- Project media ---------------------------- */
// PUBLIC bucket `project-media`. Stores the public URL on project_media.

export async function uploadProjectMedia(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const { file, error } = validateUpload(formData.get("file"), {
    types: IMAGE_MIME,
    max: MEDIA_MAX,
  });
  if (error) {
    redirect(`${editorPath(projectId)}?error=${encodeURIComponent(error)}`);
  }

  const f = file as File;
  const path = `${projectId}/media-${Date.now()}.${extFor(f.type)}`;
  const { error: upErr } = await supabase.storage
    .from("project-media")
    .upload(path, f, { contentType: f.type });
  if (upErr) {
    redirect(`${editorPath(projectId)}?error=${encodeURIComponent("Upload failed.")}`);
  }

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

  redirect(`${editorPath(projectId)}?message=media-added`);
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
// PUBLIC bucket `project-media` (floorplans subfolder).

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function addFloorplan(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  if (!projectId) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  let imageUrl: string | null = null;
  const fileEntry = formData.get("file");
  if (fileEntry instanceof File && fileEntry.size > 0) {
    const { file, error } = validateUpload(fileEntry, {
      types: IMAGE_MIME,
      max: MEDIA_MAX,
    });
    if (error) {
      redirect(`${editorPath(projectId)}?error=${encodeURIComponent(error)}`);
    }
    const f = file as File;
    const path = `${projectId}/floorplans/fp-${Date.now()}.${extFor(f.type)}`;
    const { error: upErr } = await supabase.storage
      .from("project-media")
      .upload(path, f, { contentType: f.type });
    if (upErr) {
      redirect(`${editorPath(projectId)}?error=${encodeURIComponent("Upload failed.")}`);
    }
    imageUrl = supabase.storage.from("project-media").getPublicUrl(path).data
      .publicUrl;
  }

  await supabase.from("project_floorplans").insert({
    project_id: projectId,
    plan_name: String(formData.get("plan_name") ?? "") || null,
    unit_type: String(formData.get("unit_type") ?? "") || null,
    beds: numOrNull(formData.get("beds")),
    baths: numOrNull(formData.get("baths")),
    sqft_interior: numOrNull(formData.get("sqft_interior")),
    price_public: numOrNull(formData.get("price_public")),
    floorplan_image_url: imageUrl,
  });

  redirect(`${editorPath(projectId)}?message=floorplan-added`);
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

export async function uploadDocument(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const documentType = String(formData.get("document_type") ?? "brochure").trim();
  if (!projectId) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  if (!title) {
    redirect(`${editorPath(projectId)}?error=${encodeURIComponent("A document title is required.")}`);
  }

  const { file, error } = validateUpload(formData.get("file"), {
    types: DOC_MIME,
    max: DOC_MAX,
  });
  if (error) {
    redirect(`${editorPath(projectId)}?error=${encodeURIComponent(error)}`);
  }

  const f = file as File;
  const path = `${projectId}/${Date.now()}-${safeName(f.name)}`;
  const { error: upErr } = await supabase.storage
    .from("project-documents")
    .upload(path, f, { contentType: f.type });
  if (upErr) {
    redirect(`${editorPath(projectId)}?error=${encodeURIComponent("Upload failed.")}`);
  }

  await supabase.from("project_documents").insert({
    project_id: projectId,
    document_type: documentType || "brochure",
    title,
    file_url: path, // storage path, never a public URL
    is_public: false,
    source_type: "upload",
    uploaded_by_user_id: adminId,
  });

  redirect(`${editorPath(projectId)}?message=document-added`);
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
