import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { CardImage } from "@/components/public/card-image";
import { plainSlug } from "@/lib/slug";
import { formatPriceBand, primaryBuilderName } from "@/lib/types";
import { TYPE_GATE, TYPE_SEGMENTS } from "@/lib/city-types";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * Programmatic City × Type pages — /new-homes/mississauga/condos. The pSEO
 * layer under the city hubs, governed by the scalable-keyword rule: a page
 * exists ONLY when the combo has real inventory (TYPE_GATE). Everything on
 * the page is computed from live listings, so no two pages are the same and
 * none can go stale. Below the gate → 404 (and absent from the sitemap);
 * the browse filter URLs still serve those combos without competing for
 * index space.
 */

interface Row {
  slug: string;
  project_name: string;
  builder_name: string | null;
  neighbourhood: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  price_currency: string | null;
  bedrooms_summary: string | null;
  occupancy_estimate_text: string | null;
  hero_image_url: string | null;
}

async function resolveCity(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("city")
    .not("city", "is", null)
    .limit(2000);
  const cities = [
    ...new Set(((data ?? []) as { city: string }[]).map((r) => r.city)),
  ];
  return cities.find((c) => plainSlug(c) === slug) ?? null;
}

async function getRows(city: string, dbType: string): Promise<Row[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select(
      "slug, project_name, builder_name, neighbourhood, sales_status, price_from_public, price_to_public, price_currency, bedrooms_summary, occupancy_estimate_text, hero_image_url",
    )
    .eq("city", city)
    .eq("project_type", dbType)
    .or("listing_type.is.null,listing_type.neq.for_rent")
    .order("published_at", { ascending: false })
    .limit(200);
  return (data as Row[] | null) ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; type: string }>;
}): Promise<Metadata> {
  const { city: citySlug, type } = await params;
  const seg = TYPE_SEGMENTS[type];
  if (!seg) return { title: "New homes" };
  const city = await resolveCity(citySlug);
  if (!city) return { title: "New homes" };
  return {
    title: `New ${seg.plural} in ${city} — Pre-Construction ${seg.plural} for Sale`,
    description: `Browse new and pre-construction ${seg.plural.toLowerCase()} in ${city}: live pricing, floor plans, occupancy dates, and launches — tracked and verified by LIQWD.`,
    alternates: { canonical: `/new-homes/${citySlug}/${type}` },
  };
}

export default async function CityTypePage({
  params,
}: {
  params: Promise<{ city: string; type: string }>;
}) {
  const { city: citySlug, type } = await params;
  const seg = TYPE_SEGMENTS[type];
  if (!seg) notFound();
  const city = await resolveCity(citySlug);
  if (!city) notFound();

  const rows = await getRows(city, seg.dbType);
  // The inventory gate: thin combos don't get index-competing pages.
  if (rows.length < TYPE_GATE) notFound();

  const prices = rows
    .map((r) => r.price_from_public)
    .filter((p): p is number => p != null);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const selling = rows.filter((r) => r.sales_status === "selling").length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `New ${seg.plural} in ${city}`,
    numberOfItems: rows.length,
    itemListElement: rows.slice(0, 25).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: r.project_name,
      url: `${SITE_URL}/projects/${r.slug}`,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-slate-400">
        <Link href="/projects" className="hover:text-slate-600">
          Browse
        </Link>{" "}
        /{" "}
        <Link href={`/new-homes/${citySlug}`} className="hover:text-slate-600">
          {city}
        </Link>{" "}
        / <span>{seg.plural}</span>
      </nav>
      <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-ink">
        New {seg.plural.toLowerCase()} in {city}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-slate-600">
        {rows.length} new-construction {seg.singular}{" "}
        {rows.length === 1 ? "development" : "developments"} tracked in {city}
        {selling > 0 ? `, ${selling} actively selling` : ""}
        {minPrice
          ? `, with starting prices from $${Math.round(minPrice).toLocaleString("en-CA")}`
          : ""}
        . Live data — pricing and availability update as builders release
        them.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {Object.entries(TYPE_SEGMENTS)
          .filter(([slug]) => slug !== type)
          .map(([slug, s]) => (
            <Link
              key={slug}
              href={`/new-homes/${citySlug}/${slug}`}
              className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-brand-300 hover:text-brand-700"
            >
              {s.plural} in {city}
            </Link>
          ))}
        <Link
          href={`/new-homes/${citySlug}`}
          className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 hover:border-brand-300 hover:text-brand-700"
        >
          All new homes in {city}
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Link key={r.slug} href={`/projects/${r.slug}`} className="group block h-full">
            <Card className="h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-lg">
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <CardImage
                  src={r.hero_image_url}
                  alt={r.project_name}
                  name={r.project_name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <CardBody>
                <h2 className="font-semibold text-ink group-hover:text-brand-700">
                  {r.project_name}
                </h2>
                <p className="mt-0.5 truncate text-sm text-slate-500">
                  {[primaryBuilderName(r.builder_name), r.neighbourhood]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {formatPriceBand(r.price_from_public, r.price_to_public, {
                    currency: r.price_currency,
                  }) ?? "Pricing on request"}
                  {r.bedrooms_summary ? ` · ${r.bedrooms_summary}` : ""}
                </p>
                {r.occupancy_estimate_text ? (
                  <p className="mt-1 text-xs text-slate-400">
                    {r.occupancy_estimate_text}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
