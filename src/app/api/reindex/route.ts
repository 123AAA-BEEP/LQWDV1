import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pingIndexNow } from "@/lib/indexnow";
import { plainSlug } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Bulk IndexNow submission — notifies Bing/Yandex (and the indexes behind
 * Copilot/ChatGPT search) of the full public surface at once.
 *
 * Needed because today's large batch was published via SQL, bypassing the
 * app's per-publish ping; and because the hub/tool/report pages are new. Safe
 * to re-run — IndexNow dedupes and re-crawls on its own cadence. Google is not
 * an IndexNow consumer (it discovers via sitemap + links), so this complements
 * rather than replaces the sitemap.
 *
 *   ?scope=all|projects|hubs|static   (default all)
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 */

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

const STATIC_PATHS = [
  "/",
  "/rentals",
  "/tools",
  "/tools/land-transfer-tax-calculator",
  "/tools/pre-construction-deposit-calculator",
  "/tools/hst-rebate-calculator",
  "/reports/gta-pre-construction",
  "/agents",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = url.searchParams.get("scope") ?? "all";
  const admin = createAdminClient();

  const paths: string[] = [];
  if (scope === "all" || scope === "static") paths.push(...STATIC_PATHS);

  if (scope === "all" || scope === "projects" || scope === "hubs") {
    const { data } = await admin
      .from("public_projects_view")
      .select("slug, city, builder_name")
      .limit(5000);
    const rows = (data ?? []) as { slug: string | null; city: string | null; builder_name: string | null }[];

    if (scope === "all" || scope === "projects") {
      for (const r of rows) if (r.slug) paths.push(`/projects/${r.slug}`);
    }
    if (scope === "all" || scope === "hubs") {
      const cities = new Set<string>();
      const builders = new Set<string>();
      for (const r of rows) {
        if (r.city) cities.add(plainSlug(r.city));
        const b = (r.builder_name ?? "").split(/,| and /i)[0].trim();
        if (b) builders.add(plainSlug(b));
      }
      for (const c of cities) paths.push(`/new-homes/${c}`);
      for (const b of builders) paths.push(`/builders/${b}`);
    }
  }

  const unique = [...new Set(paths)];
  // IndexNow accepts up to 10k URLs/request; chunk to be safe.
  const CHUNK = 5000;
  for (let i = 0; i < unique.length; i += CHUNK) {
    await pingIndexNow(unique.slice(i, i + CHUNK));
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), scope, submitted: unique.length });
}
