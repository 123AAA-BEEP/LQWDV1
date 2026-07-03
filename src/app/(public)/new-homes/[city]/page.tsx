import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CardImage } from "@/components/public/card-image";
import { plainSlug } from "@/lib/slug";
import { formatPriceBand, primaryBuilderName } from "@/lib/types";
import { regionForProvince } from "@/lib/regions";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * Programmatic city hubs — /new-homes/toronto, /new-homes/miami, … These rank
 * for the category searches ("new condos {city}", "pre-construction {city}")
 * that carry far more volume than any single project name, and they form the
 * internal-link mesh that gets brand-new project pages crawled fast.
 */

interface Row {
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  province: string | null;
  project_type: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  hero_image_url: string | null;
  listing_type: string | null;
}

/** Resolve the slug back to the canonical city name in our data. */
async function resolveCity(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("city")
    .not("city", "is", null)
    .limit(2000);
  const cities = [...new Set(((data ?? []) as { city: string }[]).map((r) => r.city))];
  return cities.find((c) => plainSlug(c) === slug) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return { title: "City not found" };
  return {
    title: `New Homes & Pre-Construction in ${city}`,
    description: `Browse new and pre-construction developments in ${city} — pricing, floor plans, and first access. Updated as new projects launch.`,
    alternates: { canonical: `/new-homes/${slug}` },
  };
}

export default async function CityHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { city: slug } = await params;
  const { page } = await searchParams;
  const city = await resolveCity(slug);
  if (!city) notFound();

  // Cumulative pagination: page N renders the first N pages, so "Load more"
  // appends to the grid and every state stays a crawlable URL (Toronto alone
  // exceeds any fixed cap).
  const PAGE_SIZE = 24;
  const pageNum = Math.min(Math.max(parseInt(page ?? "1", 10) || 1, 1), 50);

  const supabase = await createClient();
  const [saleRes, rentalRes] = await Promise.all([
    supabase
      .from("public_projects_view")
      .select(
        "slug, project_name, builder_name, city, province, project_type, sales_status, price_from_public, price_to_public, hero_image_url, listing_type",
        { count: "exact" },
      )
      .eq("city", city)
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .range(0, pageNum * PAGE_SIZE - 1),
    supabase
      .from("public_projects_view")
      .select("slug", { count: "exact", head: true })
      .eq("city", city)
      .eq("listing_type", "for_rent"),
  ]);
  const forSale = ((saleRes.data ?? []) as Row[]);
  const saleCount = saleRes.count ?? forSale.length;
  const rentalCount = rentalRes.count ?? 0;
  if (forSale.length === 0 && rentalCount === 0) notFound();

  const province = forSale[0]?.province ?? null;
  const regionLabel = regionForProvince(province)?.label ?? province ?? "";

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `New homes in ${city}`,
    itemListElement: forSale.slice(0, 25).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.project_name,
      url: `${SITE_URL}/projects/${p.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/projects" className="hover:text-ink hover:underline">
          New homes
        </Link>
        <span aria-hidden className="mx-1.5 text-slate-300">
          /
        </span>
        <span aria-current="page" className="font-medium text-slate-700">
          {city}
        </span>
      </nav>

      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        New homes &amp; pre-construction in {city}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        {saleCount} active development{saleCount === 1 ? "" : "s"} in {city}
        {regionLabel ? `, ${regionLabel}` : ""} — get pricing, floor plans, and
        first access before the public.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {forSale.map((p) => {
          const band = formatPriceBand(p.price_from_public, p.price_to_public);
          return (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="group block h-full">
              <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="aspect-[4/3] overflow-hidden bg-slate-100">
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
                  <h2 className="mt-2 line-clamp-2 font-semibold text-ink">
                    {p.project_name}
                  </h2>
                  {p.builder_name ? (
                    <p className="line-clamp-1 text-sm text-slate-500">
                      {primaryBuilderName(p.builder_name)}
                    </p>
                  ) : null}
                  {band ? (
                    <p className="mt-2 text-sm font-medium text-slate-700">{band}</p>
                  ) : null}
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {forSale.length < saleCount ? (
        <div className="mt-10 text-center">
          <ButtonLink
            href={`/new-homes/${slug}?page=${pageNum + 1}`}
            scroll={false}
            variant="secondary"
          >
            Load more ({saleCount - forSale.length} remaining)
          </ButtonLink>
        </div>
      ) : null}

      {rentalCount > 0 ? (
        <p className="mt-10 text-sm text-slate-600">
          Also in {city}:{" "}
          <Link
            href={`/rentals?city=${encodeURIComponent(city)}`}
            className="font-medium text-brand-700 hover:underline"
          >
            {rentalCount} new rental building{rentalCount === 1 ? "" : "s"} →
          </Link>
        </p>
      ) : null}

      <p className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-500">
        Are you a real estate agent in {city}?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Claim these pages and their buyer leads — free →
        </Link>
      </p>
    </div>
  );
}
