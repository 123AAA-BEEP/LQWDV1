import { createAdminClient } from "@/lib/supabase/admin";
import { imageSearchConfigured } from "@/lib/images";
import { sourceImageBatch } from "@/lib/source-images";

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

  const { searched, candidatesAdded } = await sourceImageBatch(
    createAdminClient(),
    batch,
  );

  return Response.json({ searched, candidates_added: candidatesAdded });
}
