import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { REGIONS, isRegionKey, visitorRegionKey } from "@/lib/regions";
import { plainSlug } from "@/lib/slug";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatPriceBand } from "@/lib/types";

export const metadata: Metadata = {
  title: "New & Pre-Construction Homes in Ontario, BC & Florida | LIQWD",
  description:
    "Browse new and pre-construction home developments across Ontario, British Columbia, and Florida — condos, towns, and single-family homes.",
};
export const dynamic = "force-dynamic";

const SELECT =
  "project_id, slug, project_name, builder_name, city, neighbourhood, province, project_type, sales_status, construction_status, price_from_public, price_to_public, hero_image_url, published_at, is_featured, is_advertiser, featured_rank";

const TYPE_OPTIONS = [
  { value: "condo", label: "Condos" },
  { value: "townhouse", label: "Townhomes" },
  { value: "single_family", label: "Single-family" },
];
const STATUS_OPTIONS = [
  { value: "coming_soon", label: "Coming soon" },
  { value: "selling", label: "Selling" },
  { value: "sold_out", label: "Sold out" },
  { value: "completed", label: "Completed" },
];

interface Row {
  project_id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  neighbourhood: string | null;
  province: string | null;
  project_type: string | null;
  sales_status: string | null;
  construction_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  hero_image_url: string | null;
  is_featured: boolean | null;
  is_advertiser: boolean | null;
  featured_rank: number | null;
}

const isFeatured = (p: Row) => Boolean(p.is_featured || p.is_advertiser);

function ProjectCard({ p, featured = false }: { p: Row; featured?: boolean }) {
  const band = formatPriceBand(p.price_from_public, p.price_to_public);
  const location = [p.neighbourhood, p.city, p.province].filter(Boolean).join(", ");
  return (
    <Link href={`/projects/${p.slug}`}>
      <Card
        className={`h-full overflow-hidden transition-shadow hover:shadow-md ${
          featured ? "ring-1 ring-amber-300" : ""
        }`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {p.hero_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.hero_image_url}
              alt={p.project_name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              No image
            </div>
          )}
          {featured ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">
              <span aria-hidden>★</span> Featured
            </span>
          ) : null}
        </div>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            {p.sales_status ? (
              <Badge tone="brand" className="capitalize">
                {p.sales_status.replace(/_/g, " ")}
              </Badge>
            ) : null}
            {p.project_type ? (
              <Badge tone="neutral" className="capitalize">
                {p.project_type.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 font-semibold text-ink">{p.project_name}</h2>
          {p.builder_name || location ? (
            <p className="text-sm text-slate-500">
              {[p.builder_name, location].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {band ? (
            <p className="mt-2 text-sm font-medium text-slate-700">{band}</p>
          ) : null}
        </CardBody>
      </Card>
    </Link>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    city?: string;
    type?: string;
    status?: string;
    region?: string;
    page?: string;
  }>;
}) {
  const { q: rawQ, city, type, status, region, page } = await searchParams;
  const q = (rawQ ?? "").trim();
  const cityFilter = (city ?? "").trim();
  const typeFilter = type ?? "";
  const statusFilter = status ?? "";
  const regionFilter = isRegionKey(region ?? "") ? (region as string) : "";
  // Cumulative pagination: page N renders the first N pages, so "Load more"
  // appends to the grid (scroll preserved) and every state is a crawlable URL.
  const PAGE_SIZE = 24;
  const pageNum = Math.min(Math.max(parseInt(page ?? "1", 10) || 1, 1), 50);

  // Geo suggestion (never a gate): visitors see a one-tap chip for their own
  // market when they aren't already filtering.
  const visitorKey = visitorRegionKey(await headers());

  const supabase = await createClient();
  const hasFilter = Boolean(
    q || cityFilter || typeFilter || statusFilter || regionFilter,
  );

  // Main results — featured/sponsored float to the top of the grid too (so they
  // mix into results as the catalog grows), then newest first.
  let req = supabase
    .from("public_projects_view")
    .select(SELECT, { count: "exact" })
    // Rentals live on /rentals — the buy browse stays for-sale only.
    .or("listing_type.is.null,listing_type.neq.for_rent")
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("is_advertiser", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .range(0, pageNum * PAGE_SIZE - 1);
  if (q) {
    req = req.or(
      `project_name.ilike.%${q}%,city.ilike.%${q}%,builder_name.ilike.%${q}%`,
    );
  }
  if (cityFilter) req = req.eq("city", cityFilter);
  if (typeFilter) req = req.eq("project_type", typeFilter);
  if (statusFilter) req = req.eq("sales_status", statusFilter);
  if (regionFilter && isRegionKey(regionFilter)) {
    // Province values vary by source ("ON" vs "Ontario") — match any form.
    req = req.or(
      REGIONS[regionFilter].provinceValues
        .map((v) => `province.ilike.${v}`)
        .join(","),
    );
  }

  // One parallel wave instead of four sequential round-trips (faster TTFB).
  // Featured strip runs only on the unfiltered browse (a curated highlight,
  // not search results) — capped at 3 for one clean desktop row.
  const [{ data: cityRows }, mainRes, featuredRes, newestRes] =
    await Promise.all([
      supabase
        .from("public_projects_view")
        .select("city")
        .not("city", "is", null)
        .order("city", { ascending: true }),
      req,
      hasFilter
        ? Promise.resolve(null)
        : supabase
            .from("public_projects_view")
            .select(SELECT)
            .or("is_featured.eq.true,is_advertiser.eq.true")
            .or("listing_type.is.null,listing_type.neq.for_rent")
            .order("featured_rank", { ascending: true, nullsFirst: false })
            .order("published_at", { ascending: false })
            .limit(3),
      hasFilter
        ? Promise.resolve(null)
        : supabase
            .from("public_projects_view")
            .select("slug, project_name, city, published_at")
            .or("listing_type.is.null,listing_type.neq.for_rent")
            .order("published_at", { ascending: false })
            .limit(6),
    ]);
  const cities = [...new Set((cityRows ?? []).map((r) => r.city as string))];
  const featured: Row[] = ((featuredRes?.data ?? null) as Row[] | null) ?? [];
  const projects = (mainRes.data as Row[] | null) ?? [];
  const totalCount = mainRes.count ?? projects.length;
  const hasMore = projects.length < totalCount;

  // "Load more" = same URL with page+1 — filters preserved, crawlable, and
  // scroll={false} keeps the visitor where they were so it feels continuous.
  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  if (cityFilter) nextParams.set("city", cityFilter);
  if (typeFilter) nextParams.set("type", typeFilter);
  if (statusFilter) nextParams.set("status", statusFilter);
  if (regionFilter) nextParams.set("region", regionFilter);
  nextParams.set("page", String(pageNum + 1));
  const loadMoreHref = `/projects?${nextParams.toString()}`;

  // Don't repeat the featured strip's cards in the grid below it.
  const stripIds = new Set(featured.map((f) => f.project_id));
  const gridProjects = featured.length
    ? projects.filter((p) => !stripIds.has(p.project_id))
    : projects;

  // "Just announced" — the newest pages, as plain crawlable links right below
  // the hero. This is the crawl path search engines follow to find brand-new
  // project pages fast (and where return visitors check for fresh releases).
  const justAnnounced = ((newestRes?.data ?? []) as {
    slug: string;
    project_name: string;
    city: string | null;
  }[]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 sm:pt-20">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            New &amp; pre-construction homes in Ontario, BC &amp; Florida
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Explore active condo, townhome, and single-family developments — and
            connect with a representative for pricing, floorplans, and
            availability.
          </p>

          {visitorKey && !hasFilter ? (
            <Link
              href={`/projects?region=${visitorKey}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100"
            >
              <span aria-hidden>📍</span> See {REGIONS[visitorKey].voice.marketLine} →
            </Link>
          ) : null}
          {regionFilter && isRegionKey(regionFilter) ? (
            <p className="mt-4 text-sm font-medium text-brand-700">
              Showing {REGIONS[regionFilter].label} —{" "}
              <Link href="/projects" className="underline hover:text-brand-800">
                show all markets
              </Link>
            </p>
          ) : null}

          <form method="get" className="mt-8 space-y-3">
            <div className="flex gap-2">
              <Input
                name="q"
                aria-label="Search by project, city, or builder"
                placeholder="Search by project, city, or builder…"
                defaultValue={q}
                className="flex-1"
              />
              <Button type="submit" variant="primary">
                Search
              </Button>
              {hasFilter ? (
                <ButtonLink href="/projects" variant="secondary">
                  Clear
                </ButtonLink>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-40 flex-1">
                <Select name="city" aria-label="City" defaultValue={cityFilter}>
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-40 flex-1">
                <Select
                  name="type"
                  aria-label="Home type"
                  defaultValue={typeFilter}
                >
                  <option value="">All home types</option>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-40 flex-1">
                <Select
                  name="status"
                  aria-label="Sales status"
                  defaultValue={statusFilter}
                >
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Just announced — crawlable freshness strip */}
      {justAnnounced.length > 0 ? (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-3 text-sm">
            <span className="font-semibold uppercase tracking-wide text-brand-700">
              Just announced:
            </span>
            {justAnnounced.map((p, i) => (
              <span key={p.slug} className="flex items-center gap-2">
                <Link
                  href={`/projects/${p.slug}`}
                  className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
                >
                  {p.project_name}
                  {p.city ? (
                    <span className="font-normal text-slate-500">
                      {" "}
                      · {p.city}
                    </span>
                  ) : null}
                </Link>
                {i < justAnnounced.length - 1 ? (
                  <span aria-hidden className="text-slate-300">
                    ·
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured */}
      {featured.length > 0 ? (
        <section className="border-b border-slate-200 bg-gradient-to-b from-amber-50/50 to-white">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="mb-5 flex items-center gap-2">
              <span aria-hidden className="text-amber-500">
                ★
              </span>
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                Featured developments
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <ProjectCard key={p.project_id} p={p} featured />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Browse by city — crawlable entry points into the city hubs */}
      {!hasFilter && cities.length > 0 ? (
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-1.5 px-6 py-3 text-sm">
            <span className="font-semibold uppercase tracking-wide text-slate-500">
              Browse by city:
            </span>
            {cities.slice(0, 14).map((c) => (
              <Link
                key={c}
                href={`/new-homes/${plainSlug(c)}`}
                className="rounded-full border border-slate-200 px-2.5 py-0.5 text-slate-600 hover:border-brand-300 hover:text-brand-700"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-6 text-sm text-slate-500">
          Showing {projects.length} of {totalCount} development
          {totalCount === 1 ? "" : "s"}
          {hasFilter ? " matching your search" : ""}.
        </p>

        {gridProjects.length === 0 ? (
          featured.length > 0 ? null : (
            <Card>
              <CardBody className="text-center text-sm text-slate-500">
                {hasFilter
                  ? "No developments match your search. Try clearing filters."
                  : "No developments are published yet. Check back soon."}
              </CardBody>
            </Card>
          )
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gridProjects.map((p) => (
              <ProjectCard key={p.project_id} p={p} featured={isFeatured(p)} />
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="mt-10 text-center">
            <ButtonLink href={loadMoreHref} scroll={false} variant="secondary">
              Load more ({totalCount - projects.length} remaining)
            </ButtonLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
