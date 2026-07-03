import { NextResponse } from "next/server";
import { sourceHeroForMissing } from "@/lib/hero-sourcing";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Backfills heroes + galleries for published pages that went live without
 * imagery (intake publishes on facts; imagery can lag behind).
 *   ?project=<id>  target one just-published project (fired from ingest)
 *   ?limit=N       otherwise drain up to N published-no-hero pages (max 3)
 *   ?ui=1          self-refreshing runner — keeps going until the queue is dry
 * Key-gated with the intake secret, same as /api/seo-backfill.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const project = url.searchParams.get("project") ?? undefined;
  const ui = url.searchParams.get("ui") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 1) || 1, 3);
  const results = await sourceHeroForMissing(project, limit);

  const body = { ranAt: new Date().toISOString(), results };
  if (ui) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();
    const { count } = await admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("record_status", "published")
      .is("hero_image_url", null)
      .not("import_notes", "ilike", "%auto-pipeline: no rendering%");
    const remaining = count ?? 0;
    const html = `<!doctype html><meta charset="utf-8">${
      remaining > 0 ? `<meta http-equiv="refresh" content="4">` : ""
    }<title>Hero backfill</title><body style="font-family:ui-monospace,monospace;padding:24px;background:#0b1220;color:#e2e8f0"><h2 style="margin:0 0 12px">Hero backfill ${
      remaining > 0 ? "— running…" : "— done"
    }</h2><pre style="white-space:pre-wrap">${JSON.stringify(body, null, 2)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</pre><p>${
      remaining > 0
        ? `${remaining} page(s) still missing a hero — this page refreshes until the queue is drained.`
        : "Queue drained."
    }</p></body>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  }
  return NextResponse.json(body);
}
