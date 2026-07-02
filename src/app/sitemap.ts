import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

// Listings are published/updated over time, so build the sitemap per request
// rather than freezing it at build time.
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/projects`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let projectRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    // public_projects_view already filters to active, public_page_enabled,
    // record_status='published'. We additionally honour the per-page
    // `indexable` flag so noindex pages stay out of the sitemap.
    const { data } = await supabase
      .from("public_projects_view")
      .select("slug, published_at, page_updated_at, indexable")
      .limit(5000);
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

  return [...staticRoutes, ...projectRoutes];
}
