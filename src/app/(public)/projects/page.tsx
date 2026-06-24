import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatPriceBand } from "@/lib/types";

export const metadata: Metadata = {
  title: "New & Pre-Construction Homes in Ontario | LIQWD",
  description:
    "Browse new and pre-construction home developments across Ontario — condos, towns, and single-family homes.",
};
export const dynamic = "force-dynamic";

const SELECT =
  "project_id, slug, project_name, builder_name, city, neighbourhood, province, project_type, sales_status, construction_status, price_from_public, price_to_public, hero_image_url, published_at, is_featured, is_advertiser";

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
              <Badge tone="brand">{p.sales_status.replace(/_/g, " ")}</Badge>
            ) : null}
            {p.project_type ? (
              <Badge tone="neutral">{p.project_type.replace(/_/g, " ")}</Badge>
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
  }>;
}) {
  const { q: rawQ, city, type, status } = await searchParams;
  const q = (rawQ ?? "").trim();
  const cityFilter = (city ?? "").trim();
  const typeFilter = type ?? "";
  const statusFilter = status ?? "";

  const supabase = await createClient();

  const { data: cityRows } = await supabase
    .from("public_projects_view")
    .select("city")
    .not("city", "is", null)
    .order("city", { ascending: true });
  const cities = [...new Set((cityRows ?? []).map((r) => r.city as string))];

  const hasFilter = Boolean(q || cityFilter || typeFilter || statusFilter);

  // Featured strip — only on the unfiltered browse (a curated highlight, not
  // search results). Capped at 3 so it's always one clean desktop row (shows
  // 1–3 depending on how many are featured). Any extra featured/sponsored
  // listings pepper into the results grid below (floated to top, badged).
  let featured: Row[] = [];
  if (!hasFilter) {
    const { data: fData } = await supabase
      .from("public_projects_view")
      .select(SELECT)
      .or("is_featured.eq.true,is_advertiser.eq.true")
      .order("published_at", { ascending: false })
      .limit(3);
    featured = (fData as Row[] | null) ?? [];
  }

  // Main results — featured/sponsored float to the top of the grid too (so they
  // mix into results as the catalog grows), then newest first.
  let req = supabase
    .from("public_projects_view")
    .select(SELECT)
    .order("is_advertiser", { ascending: false })
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(60);
  if (q) {
    req = req.or(
      `project_name.ilike.%${q}%,city.ilike.%${q}%,builder_name.ilike.%${q}%`,
    );
  }
  if (cityFilter) req = req.eq("city", cityFilter);
  if (typeFilter) req = req.eq("project_type", typeFilter);
  if (statusFilter) req = req.eq("sales_status", statusFilter);

  const { data } = await req;
  const projects = (data as Row[] | null) ?? [];

  // Don't repeat the featured strip's cards in the grid below it.
  const stripIds = new Set(featured.map((f) => f.project_id));
  const gridProjects = featured.length
    ? projects.filter((p) => !stripIds.has(p.project_id))
    : projects;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 sm:pt-20">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            New &amp; pre-construction homes in Ontario
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Explore active condo, townhome, and single-family developments — and
            connect with a representative for pricing, floorplans, and
            availability.
          </p>

          <form method="get" className="mt-8 space-y-3">
            <div className="flex gap-2">
              <Input
                name="q"
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
                <Select name="city" defaultValue={cityFilter}>
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-40 flex-1">
                <Select name="type" defaultValue={typeFilter}>
                  <option value="">All home types</option>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-40 flex-1">
                <Select name="status" defaultValue={statusFilter}>
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

      {/* Grid */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-6 text-sm text-slate-500">
          {projects.length} development{projects.length === 1 ? "" : "s"}
          {hasFilter ? " match your search" : " available"}.
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
      </section>
    </div>
  );
}
