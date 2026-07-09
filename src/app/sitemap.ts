import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { REGION_KEYS, regionSlug } from "@/lib/regions";
import { plainSlug } from "@/lib/slug";

// Listings are published/updated over time, so build the sitemap per request
// rather than freezing it at build time.
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/agents`, changeFrequency: "weekly", priority: 0.8 },
    // Campaign pitch variants — one focused angle per page.
    { url: `${SITE_URL}/agents/early-access`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/agents/one-portal`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/agents/off-market`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/rentals`, changeFrequency: "daily", priority: 0.8 },
    ...REGION_KEYS.map((k) => ({
      url: `${SITE_URL}/agents/${regionSlug(k)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    // Buyer tools — evergreen, high-intent transactional queries.
    { url: `${SITE_URL}/tools`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/tools/land-transfer-tax-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/tools/pre-construction-deposit-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/tools/hst-rebate-calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let projectRoutes: MetadataRoute.Sitemap = [];
  let cityRoutes: MetadataRoute.Sitemap = [];
  let builderRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    // public_projects_view already filters to active, public_page_enabled,
    // record_status='published'. We additionally honour the per-page
    // `indexable` flag so noindex pages stay out of the sitemap.
    const { data } = await supabase
      .from("public_projects_view")
      .select("slug, published_at, page_updated_at, indexable, city, builder_name")
      .limit(5000);

    // Programmatic builder hubs — one per primary builder with 2+ projects
    // (a single-project "builder" is better served by the project page).
    const builderCounts = new Map<string, number>();
    for (const r of (data ?? []) as { builder_name: string | null }[]) {
      const primary = (r.builder_name ?? "").split(/,| and /i)[0].trim();
      if (primary) builderCounts.set(primary, (builderCounts.get(primary) ?? 0) + 1);
    }
    builderRoutes = [...builderCounts.entries()]
      .filter(([, n]) => n >= 2)
      .map(([b]) => ({
        url: `${SITE_URL}/builders/${plainSlug(b)}`,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));

    // Programmatic city hubs — one per city with at least one live page.
    const cities = [
      ...new Set(
        ((data ?? []) as { city: string | null }[])
          .map((r) => r.city)
          .filter((c): c is string => Boolean(c)),
      ),
    ];
    cityRoutes = cities.map((c) => ({
      url: `${SITE_URL}/new-homes/${plainSlug(c)}`,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
    projectRoutes = (
      (data ?? []) as {
        slug: string | null;
        published_at: string | null;
        page_updated_at: string | null;
        indexable: boolean | null;
      }[]
    )
      .filter((r) => r.slug && r.indexable !== false)
      .map((r) => ({
        url: `${SITE_URL}/projects/${r.slug}`,
        // Real freshness: content updates (SEO fills, edits) move lastmod.
        lastModified: r.page_updated_at
          ? new Date(r.page_updated_at)
          : r.published_at
            ? new Date(r.published_at)
            : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch {
    // If the data layer is unavailable, still return the static routes.
  }

  return [...staticRoutes, ...cityRoutes, ...builderRoutes, ...projectRoutes];
}
