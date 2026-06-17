import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  googleImageSearch,
  imageQueryForProject,
  rankCandidates,
} from "@/lib/images";

/**
 * Sources image candidates for the next batch of projects that have no hero and
 * haven't been searched yet. One Google CSE query per project; results are
 * domain-bias-ranked (builder-hosted first) before being staged as 'pending'.
 * Used by both the admin action and the cron route. Service-role db client.
 */
export async function sourceImageBatch(
  adminDb: SupabaseClient,
  batch: number,
): Promise<{ searched: number; candidatesAdded: number }> {
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

  let candidatesAdded = 0;
  for (const p of rows) {
    const found = await googleImageSearch(imageQueryForProject(p), 8);
    if (found.length === 0) {
      // Marker so we don't re-query this project forever.
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

    const ranked = rankCandidates(found, p);
    const records = ranked.map((c, i) => ({
      project_id: p.id,
      image_url: c.imageUrl,
      source_url: c.sourceUrl,
      source_title: c.sourceTitle,
      provider: "google_cse",
      width: c.width,
      height: c.height,
      rank: i, // already domain-bias-ordered
      status: "pending",
    }));
    await adminDb
      .from("project_media_candidates")
      .upsert(records, { onConflict: "project_id,image_url", ignoreDuplicates: true });
    candidatesAdded += records.length;
  }

  return { searched: rows.length, candidatesAdded };
}
