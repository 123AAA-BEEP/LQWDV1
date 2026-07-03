import { NextResponse } from "next/server";
import { sourceHeroForMissing } from "@/lib/hero-sourcing";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Backfills heroes for published pages that went live without one (intake
 * publishes on facts; imagery can lag behind).
 *   ?project=<id>  target one just-published project (fired from ingest)
 *   ?limit=N       otherwise drain up to N published-no-hero pages (max 3)
 * Key-gated with the intake secret, same as /api/seo-backfill.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const project = url.searchParams.get("project") ?? undefined;
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 1) || 1, 3);
  const results = await sourceHeroForMissing(project, limit);
  return NextResponse.json({ ranAt: new Date().toISOString(), results });
}
