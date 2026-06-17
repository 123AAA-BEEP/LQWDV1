import { createAdminClient } from "@/lib/supabase/admin";
import {
  googleImageSearch,
  imageQueryForProject,
  imageSearchConfigured,
} from "@/lib/images";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hands-off image sourcing for a batch of projects. Protect with CRON_SECRET
 * and wire to a Vercel Cron job:
 *
 *   // vercel.json
 *   { "crons": [{ "path": "/api/cron/source-images", "schedule": "0 * * * *" }] }
 *
 * Vercel cron requests carry "Authorization: Bearer <CRON_SECRET>".
 * Candidates land as 'pending' for admin review — nothing publishes here.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!imageSearchConfigured()) {
    return Response.json({ error: "Image search not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const batch = Math.min(
    Math.max(parseInt(url.searchParams.get("batch") ?? "10", 10) || 10, 1),
    25,
  );

  const adminDb = createAdminClient();

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
    await adminDb.from("project_media_candidates").upsert(
      candidates.map((c, i) => ({
        project_id: p.id,
        image_url: c.imageUrl,
        source_url: c.sourceUrl,
        source_title: c.sourceTitle,
        provider: "google_cse",
        width: c.width,
        height: c.height,
        rank: i,
        status: "pending",
      })),
      { onConflict: "project_id,image_url", ignoreDuplicates: true },
    );
    found += candidates.length;
  }

  return Response.json({ searched: rows.length, candidates_added: found });
}
