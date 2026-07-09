import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { plainSlug } from "@/lib/slug";
import { regionForProvince } from "@/lib/regions";
import {
  generateCityHub,
  generateBuilderHub,
  type CityHubFacts,
  type BuilderHubFacts,
} from "@/lib/hub-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hub-content drain — generates and caches prose for city and builder hubs.
 *
 * INVENTORY GATE (anti-thin-content): only hubs with enough real projects get
 * AI prose. Below the threshold a hub renders data-only (counts, grid) with no
 * manufactured essay, so we never ship doorway pages. Data modules on the page
 * itself scale to every hub for free; this route only fills the prose layer.
 *
 *   ?type=city|builder   which hub kind (default city)
 *   ?limit=2             hubs per run (max 4 — each is one Opus call)
 *   ?slug=<slug>         optional: (re)generate one specific hub
 *   ?force=1             regenerate even if fresh content exists
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 */

const CITY_MIN_PROJECTS = 8;
const BUILDER_MIN_PROJECTS = 3;

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

interface PRow {
  project_name: string;
  builder_name: string | null;
  city: string | null;
  province: string | null;
  project_type: string | null;
  price_from_public: number | null;
  price_currency: string | null;
}

function typeCounts(rows: { project_type: string | null }[]) {
  const c = { condo: 0, townhouse: 0, single_family: 0 };
  for (const r of rows) {
    if (r.project_type === "condo") c.condo++;
    else if (r.project_type === "townhouse") c.townhouse++;
    else if (r.project_type === "single_family") c.single_family++;
  }
  return c;
}

/** Most-frequent builder names among rows, most-active first. */
function topBuilders(rows: { builder_name: string | null }[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.builder_name) continue;
    // A row can list multiple builders "A, B" — count the primary.
    const primary = r.builder_name.split(/,| and /i)[0].trim();
    if (primary) counts.set(primary, (counts.get(primary) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

async function runCities(
  admin: ReturnType<typeof createAdminClient>,
  limit: number,
  onlySlug: string | null,
  force: boolean,
): Promise<{ slug: string; outcome: string }[]> {
  const { data: rows } = await admin
    .from("public_projects_view")
    .select("project_name, builder_name, city, province, project_type, price_from_public, price_currency, listing_type")
    .not("city", "is", null)
    .limit(3000);
  const all = ((rows ?? []) as (PRow & { listing_type: string | null })[]).filter(
    (r) => r.listing_type !== "for_rent",
  );

  // Group by city, keep only cities meeting the inventory gate.
  const byCity = new Map<string, PRow[]>();
  for (const r of all) {
    const c = r.city as string;
    if (!byCity.has(c)) byCity.set(c, []);
    byCity.get(c)!.push(r);
  }
  const eligible = [...byCity.entries()]
    .filter(([, rs]) => rs.length >= CITY_MIN_PROJECTS)
    .sort((a, b) => b[1].length - a[1].length);

  const { data: existing } = await admin
    .from("seo_hub_content")
    .select("hub_key, slug")
    .eq("hub_type", "city");
  const done = new Set(((existing ?? []) as { hub_key: string }[]).map((e) => e.hub_key));

  const queue = eligible
    .filter(([city]) => (onlySlug ? plainSlug(city) === onlySlug : force || !done.has(city)))
    .slice(0, limit);

  const results: { slug: string; outcome: string }[] = [];
  for (const [city, rs] of queue) {
    const province = rs.find((r) => r.province)?.province ?? null;
    const currency = rs.find((r) => r.price_currency)?.price_currency ?? "CAD";
    const prices = rs.map((r) => r.price_from_public).filter((n): n is number => n != null);
    const facts: CityHubFacts = {
      city,
      province,
      regionLabel: regionForProvince(province)?.label ?? province ?? "",
      currency,
      projectCount: rs.length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      typeCounts: typeCounts(rs),
      topBuilders: topBuilders(rs),
      sampleProjects: rs.slice(0, 6).map((r) => r.project_name),
    };
    const content = await generateCityHub(facts);
    if (!content) {
      results.push({ slug: plainSlug(city), outcome: "generation failed — skipped" });
      continue;
    }
    await admin.from("seo_hub_content").upsert(
      {
        hub_type: "city",
        hub_key: city,
        slug: plainSlug(city),
        province,
        intro: content.intro,
        investor: content.investor,
        first_time: content.first_time,
        how_it_works: content.how_it_works,
        faq: content.faq,
        meta_title: content.meta_title,
        meta_description: content.meta_description,
        project_count: rs.length,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "hub_type,hub_key" },
    );
    results.push({ slug: plainSlug(city), outcome: `generated (${content.faq.length} FAQ)` });
  }
  return results;
}

async function runBuilders(
  admin: ReturnType<typeof createAdminClient>,
  limit: number,
  onlySlug: string | null,
  force: boolean,
): Promise<{ slug: string; outcome: string }[]> {
  const { data: rows } = await admin
    .from("public_projects_view")
    .select("project_name, builder_name, city, province, project_type, listing_type")
    .not("builder_name", "is", null)
    .limit(3000);
  const all = ((rows ?? []) as (PRow & { listing_type: string | null })[]).filter(
    (r) => r.listing_type !== "for_rent",
  );

  // Group by PRIMARY builder name (first of a "A, B" list).
  const byBuilder = new Map<string, PRow[]>();
  for (const r of all) {
    const primary = (r.builder_name ?? "").split(/,| and /i)[0].trim();
    if (!primary) continue;
    if (!byBuilder.has(primary)) byBuilder.set(primary, []);
    byBuilder.get(primary)!.push(r);
  }
  const eligible = [...byBuilder.entries()]
    .filter(([, rs]) => rs.length >= BUILDER_MIN_PROJECTS)
    .sort((a, b) => b[1].length - a[1].length);

  const { data: existing } = await admin
    .from("seo_hub_content")
    .select("hub_key")
    .eq("hub_type", "builder");
  const done = new Set(((existing ?? []) as { hub_key: string }[]).map((e) => e.hub_key));

  const queue = eligible
    .filter(([b]) => (onlySlug ? plainSlug(b) === onlySlug : force || !done.has(b)))
    .slice(0, limit);

  const results: { slug: string; outcome: string }[] = [];
  for (const [builder, rs] of queue) {
    const province = rs.find((r) => r.province)?.province ?? null;
    const cities = [...new Set(rs.map((r) => r.city).filter(Boolean) as string[])];
    const facts: BuilderHubFacts = {
      builder,
      cities,
      projectCount: rs.length,
      typeCounts: typeCounts(rs),
      sampleProjects: rs.slice(0, 6).map((r) => r.project_name),
      primaryProvince: province,
    };
    const content = await generateBuilderHub(facts);
    if (!content) {
      results.push({ slug: plainSlug(builder), outcome: "generation failed — skipped" });
      continue;
    }
    await admin.from("seo_hub_content").upsert(
      {
        hub_type: "builder",
        hub_key: builder,
        slug: plainSlug(builder),
        province,
        intro: content.intro,
        investor: content.investor,
        first_time: content.first_time,
        how_it_works: content.how_it_works,
        faq: content.faq,
        meta_title: content.meta_title,
        meta_description: content.meta_description,
        project_count: rs.length,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "hub_type,hub_key" },
    );
    results.push({ slug: plainSlug(builder), outcome: `generated (${content.faq.length} FAQ)` });
  }
  return results;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const type = url.searchParams.get("type") === "builder" ? "builder" : "city";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 2, 1), 4);
  const onlySlug = url.searchParams.get("slug");
  const force = url.searchParams.get("force") === "1";

  const admin = createAdminClient();
  const results =
    type === "builder"
      ? await runBuilders(admin, limit, onlySlug, force)
      : await runCities(admin, limit, onlySlug, force);

  return NextResponse.json({ ranAt: new Date().toISOString(), type, processed: results.length, results });
}
