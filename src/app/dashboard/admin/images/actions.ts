"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import {
  googleImageSearch,
  imageQueryForProject,
  imageSearchConfigured,
  fetchImage,
} from "@/lib/images";

const PAGE = "/dashboard/admin/images";
const back = (params: string) => redirect(`${PAGE}?${params}`);

interface CandidateRow {
  id: string;
  project_id: string;
  image_url: string;
  source_url: string | null;
}

/**
 * Downloads a candidate image, uploads it to the public project-media bucket,
 * records a project_media row, sets the project hero (if empty), and marks the
 * candidate approved. Runs with the service-role client so it works from both
 * the admin UI and the cron worker. NETWORK: only succeeds where the runtime
 * has egress (Vercel) — not the dev sandbox.
 */
export async function ingestCandidate(
  adminDb: SupabaseClient,
  candidate: CandidateRow,
  adminId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fetched = await fetchImage(candidate.image_url);
  if (!fetched.ok) return { ok: false, error: fetched.error };

  const path = `${candidate.project_id}/${candidate.id}.${fetched.ext}`;
  const { error: upErr } = await adminDb.storage
    .from("project-media")
    .upload(path, fetched.bytes, {
      contentType: fetched.contentType,
      upsert: true,
    });
  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  const {
    data: { publicUrl },
  } = adminDb.storage.from("project-media").getPublicUrl(path);

  await adminDb.from("project_media").insert({
    project_id: candidate.project_id,
    media_type: "image",
    url: publicUrl,
    is_public: true,
    source_url: candidate.source_url,
  });

  const { data: proj } = await adminDb
    .from("projects")
    .select("hero_image_url")
    .eq("id", candidate.project_id)
    .maybeSingle();
  if (!proj?.hero_image_url) {
    await adminDb
      .from("projects")
      .update({ hero_image_url: publicUrl })
      .eq("id", candidate.project_id);
  }

  await adminDb
    .from("project_media_candidates")
    .update({
      status: "approved",
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", candidate.id);

  return { ok: true };
}

/**
 * Sources image candidates for the next batch of projects that have no hero
 * and haven't been searched yet. One Google CSE query per project.
 */
export async function sourceImagesBatch(formData: FormData) {
  const supabase = await createClient();
  await assertAdmin(supabase);

  if (!imageSearchConfigured()) {
    back("error=" + encodeURIComponent("Set GOOGLE_CSE_KEY and GOOGLE_CSE_CX in the environment first."));
  }

  const batch = Math.min(
    Math.max(parseInt(String(formData.get("batch") ?? "10"), 10) || 10, 1),
    25,
  );

  const adminDb = createAdminClient();

  // Skip projects that already have candidates (any status).
  const { data: seenRows } = await adminDb
    .from("project_media_candidates")
    .select("project_id")
    .limit(10000);
  const seen = [...new Set((seenRows ?? []).map((r) => r.project_id as string))];

  let q = adminDb
    .from("projects")
    .select("id, project_name, city, builder_name")
    .or("hero_image_url.is.null,hero_image_url.eq.")
    .order("created_at", { ascending: false })
    .limit(batch);
  if (seen.length > 0) q = q.not("id", "in", `(${seen.join(",")})`);

  const { data: projects } = await q;
  const rows = (projects ?? []) as {
    id: string;
    project_name: string;
    city: string | null;
    builder_name: string | null;
  }[];

  let found = 0;
  for (const p of rows) {
    const candidates = await googleImageSearch(imageQueryForProject(p), 6);
    if (candidates.length === 0) {
      // Insert a marker so we don't re-query this project forever.
      await adminDb.from("project_media_candidates").upsert(
        {
          project_id: p.id,
          image_url: `none://no-results/${p.id}`,
          provider: "google_cse",
          status: "rejected",
        },
        { onConflict: "project_id,image_url", ignoreDuplicates: true },
      );
      continue;
    }
    const records = candidates.map((c, i) => ({
      project_id: p.id,
      image_url: c.imageUrl,
      source_url: c.sourceUrl,
      source_title: c.sourceTitle,
      provider: "google_cse",
      width: c.width,
      height: c.height,
      rank: i,
      status: "pending",
    }));
    await adminDb
      .from("project_media_candidates")
      .upsert(records, { onConflict: "project_id,image_url", ignoreDuplicates: true });
    found += records.length;
  }

  revalidatePath(PAGE);
  back(`message=${encodeURIComponent(`Searched ${rows.length} project(s); added ${found} candidate(s).`)}`);
}

/** Approves one candidate → ingests it as the project hero/media. */
export async function approveCandidate(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "");
  if (!candidateId) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);
  const adminDb = createAdminClient();

  const { data: candidate } = await adminDb
    .from("project_media_candidates")
    .select("id, project_id, image_url, source_url")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) back("error=" + encodeURIComponent("Candidate not found."));

  const result = await ingestCandidate(adminDb, candidate as CandidateRow, adminId);
  revalidatePath(PAGE);
  if (!result.ok) back("error=" + encodeURIComponent(result.error));
  back("message=" + encodeURIComponent("Image approved and set."));
}

/** Rejects a candidate so it drops out of the review queue. */
export async function rejectCandidate(formData: FormData) {
  const candidateId = String(formData.get("candidate_id") ?? "");
  if (!candidateId) return;

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);

  await supabase
    .from("project_media_candidates")
    .update({
      status: "rejected",
      reviewed_by_user_id: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", candidateId);

  revalidatePath(PAGE);
  back("message=" + encodeURIComponent("Candidate rejected."));
}

/** Manually attach an image by URL (still fetched + ingested server-side). */
export async function addManualImage(formData: FormData) {
  const projectId = String(formData.get("project_id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  if (!projectId || !/^https?:\/\//i.test(imageUrl)) {
    back("error=" + encodeURIComponent("Enter a valid image URL."));
  }

  const supabase = await createClient();
  const adminId = await assertAdmin(supabase);
  const adminDb = createAdminClient();

  const { data: inserted } = await adminDb
    .from("project_media_candidates")
    .upsert(
      {
        project_id: projectId,
        image_url: imageUrl,
        provider: "manual",
        status: "pending",
      },
      { onConflict: "project_id,image_url", ignoreDuplicates: false },
    )
    .select("id, project_id, image_url, source_url")
    .maybeSingle();
  if (!inserted) back("error=" + encodeURIComponent("Could not save that URL."));

  const result = await ingestCandidate(adminDb, inserted as CandidateRow, adminId);
  revalidatePath(PAGE);
  if (!result.ok) back("error=" + encodeURIComponent(result.error));
  back("message=" + encodeURIComponent("Image added and set."));
}
