import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CardImage } from "@/components/public/card-image";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  formatPriceBand,
  primaryBuilderName,
  RENTAL_STATUS_LABELS,
} from "@/lib/types";

export const metadata: Metadata = {
  title: "New Rental Buildings in Ontario | LIQWD",
  description:
    "Browse brand-new and lease-up purpose-built rental buildings across Ontario — be first in line for suites, rents, and move-in dates.",
};
export const dynamic = "force-dynamic";

const SELECT =
  "project_id, slug, project_name, builder_name, city, neighbourhood, province, project_type, sales_status, price_from_public, price_to_public, hero_image_url, published_at, is_featured, is_advertiser, featured_rank";

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
  price_from_public: number | null;
  price_to_public: number | null;
  hero_image_url: string | null;
}

function RentalCard({ p }: { p: Row }) {
  const band = formatPriceBand(p.price_from_public, p.price_to_public, {
    monthly: true,
  });
  const location = [p.neighbourhood, p.city, p.province]
    .filter(Boolean)
    .join(", ");
  return (
    <Link href={`/projects/${p.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <CardImage
            src={p.hero_image_url}
            alt={p.project_name}
            name={p.project_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            {p.sales_status ? (
              <Badge tone="brand">
                {RENTAL_STATUS_LABELS[p.sales_status] ??
                  p.sales_status.replace(/_/g, " ")}
              </Badge>
            ) : null}
            <Badge tone="neutral">Rental</Badge>
          </div>
          <h2 className="mt-2 line-clamp-2 font-semibold text-ink">
            {p.project_name}
          </h2>
          {p.builder_name || location ? (
            <p className="line-clamp-1 text-sm text-slate-500">
              {[primaryBuilderName(p.builder_name), location]
                .filter(Boolean)
                .join(" · ")}
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

export default async function RentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; page?: string }>;
}) {
  const { q: rawQ, city, page } = await searchParams;
  const q = (rawQ ?? "").trim();
  const cityFilter = (city ?? "").trim();
  const hasFilter = Boolean(q || cityFilter);
  // Cumulative pagination: page N renders the first N pages, so "Load more"
  // appends to the grid (scroll preserved) and every state is a crawlable URL.
  const PAGE_SIZE = 24;
  const pageNum = Math.min(Math.max(parseInt(page ?? "1", 10) || 1, 1), 50);

  const supabase = await createClient();

  let req = supabase
    .from("public_projects_view")
    .select(SELECT, { count: "exact" })
    .eq("listing_type", "for_rent")
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("is_featured", { ascending: false })
    .order("published_at", { ascending: false })
    .range(0, pageNum * PAGE_SIZE - 1);
  if (q) {
    req = req.or(
      `project_name.ilike.%${q}%,city.ilike.%${q}%,builder_name.ilike.%${q}%`,
    );
  }
  if (cityFilter) req = req.eq("city", cityFilter);

  const [{ data: cityRows }, { data, count }] = await Promise.all([
    supabase
      .from("public_projects_view")
      .select("city")
      .eq("listing_type", "for_rent")
      .not("city", "is", null)
      .order("city", { ascending: true }),
    req,
  ]);
  const cities = [...new Set((cityRows ?? []).map((r) => r.city as string))];
  const rentals = (data as Row[] | null) ?? [];
  const totalCount = count ?? rentals.length;
  const hasMore = rentals.length < totalCount;

  const nextParams = new URLSearchParams();
  if (q) nextParams.set("q", q);
  if (cityFilter) nextParams.set("city", cityFilter);
  nextParams.set("page", String(pageNum + 1));
  const loadMoreHref = `/rentals?${nextParams.toString()}`;

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-10 pt-14 sm:pt-20">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            New rental buildings in Ontario
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Brand-new and lease-up purpose-built rentals — check availability
            and be first in line for suites, rents, and move-in dates.
          </p>

          <form method="get" className="mt-8 flex flex-wrap gap-2">
            <Input
              name="q"
              aria-label="Search by building, city, or developer"
              placeholder="Search by building, city, or developer…"
              defaultValue={q}
              className="min-w-52 flex-1"
            />
            <div className="min-w-40">
              <Select name="city" aria-label="City" defaultValue={cityFilter}>
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
            {hasFilter ? (
              <ButtonLink href="/rentals" variant="secondary">
                Clear
              </ButtonLink>
            ) : null}
          </form>
        </div>
      </section>

      {/* Grid — soft wash so the white cards read as objects, not wallpaper */}
      <section className="border-t border-slate-100 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="mb-6 text-sm text-slate-500">
          Showing {rentals.length} of {totalCount} rental building
          {totalCount === 1 ? "" : "s"}
          {hasFilter ? " matching your search" : ""}.
        </p>

        {rentals.length === 0 ? (
          <Card>
            <CardBody className="space-y-2 text-center text-sm text-slate-500">
              <p>
                {hasFilter
                  ? "No rental buildings match your search."
                  : "New rental buildings are being added — check back soon."}
              </p>
              <p>
                Looking to buy instead?{" "}
                <Link
                  href="/projects"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Browse new &amp; pre-construction homes →
                </Link>
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rentals.map((p) => (
              <RentalCard key={p.project_id} p={p} />
            ))}
          </div>
        )}

        {hasMore ? (
          <div className="mt-10 text-center">
            <ButtonLink href={loadMoreHref} scroll={false} variant="secondary">
              Load more ({totalCount - rentals.length} remaining)
            </ButtonLink>
          </div>
        ) : null}
        </div>
      </section>
    </div>
  );
}
