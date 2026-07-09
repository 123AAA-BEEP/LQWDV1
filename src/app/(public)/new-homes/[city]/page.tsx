import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CardImage } from "@/components/public/card-image";
import { Prose, Accordion, HubFaq, Stat } from "@/components/public/hub-sections";
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
 *
 * DATA modules (snapshot, price bands, home types, builders) are computed live
 * from inventory — always true, unique per city, no thin-content risk. PROSE
 * (overview, investor/first-time education, FAQ) is cached in seo_hub_content,
 * generated only for cities past the inventory gate; thin cities render
 * data-only, which keeps doorway pages off the domain.
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
  price_currency: string | null;
  hero_image_url: string | null;
  listing_type: string | null;
}

interface HubContentRow {
  intro: string | null;
  investor: string | null;
  first_time: string | null;
  how_it_works: string | null;
  faq: { question: string; answer: string }[] | null;
  meta_title: string | null;
  meta_description: string | null;
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

async function getHubContent(slug: string): Promise<HubContentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_hub_content")
    .select("intro, investor, first_time, how_it_works, faq, meta_title, meta_description")
    .eq("hub_type", "city")
    .eq("slug", slug)
    .maybeSingle();
  return (data as HubContentRow) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return { title: "City not found" };
  const hub = await getHubContent(slug);
  return {
    title: hub?.meta_title || `New Homes & Pre-Construction in ${city}`,
    description:
      hub?.meta_description ||
      `Browse new and pre-construction developments in ${city} — pricing, floor plans, and first access. Updated as new projects launch.`,
    alternates: { canonical: `/new-homes/${slug}` },
  };
}

function money(n: number | null, currency: string | null): string {
  if (n == null) return "";
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-CA", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "CAD",
    maximumFractionDigits: 0,
  }).format(n);
}

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $600K", max: 600_000 },
  { label: "$600K–$800K", min: 600_000, max: 800_000 },
  { label: "$800K–$1M", min: 800_000, max: 1_000_000 },
  { label: "$1M+", min: 1_000_000 },
];

const TYPE_LABELS: { key: string; label: string }[] = [
  { key: "condo", label: "Condos" },
  { key: "townhouse", label: "Townhomes" },
  { key: "single_family", label: "Single-family" },
];

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

  const PAGE_SIZE = 24;
  const pageNum = Math.min(Math.max(parseInt(page ?? "1", 10) || 1, 1), 50);

  const supabase = await createClient();
  const [saleRes, allSaleRes, rentalRes, hub, otherCitiesRes] = await Promise.all([
    supabase
      .from("public_projects_view")
      .select(
        "slug, project_name, builder_name, city, province, project_type, sales_status, price_from_public, price_to_public, price_currency, hero_image_url, listing_type",
        { count: "exact" },
      )
      .eq("city", city)
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .order("is_featured", { ascending: false })
      .order("published_at", { ascending: false })
      .range(0, pageNum * PAGE_SIZE - 1),
    // Lightweight full pull for the data modules (type mix, price bands, builders).
    supabase
      .from("public_projects_view")
      .select("project_type, price_from_public, price_currency, builder_name, listing_type")
      .eq("city", city)
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .limit(2000),
    supabase
      .from("public_projects_view")
      .select("slug", { count: "exact", head: true })
      .eq("city", city)
      .eq("listing_type", "for_rent"),
    getHubContent(slug),
    supabase
      .from("public_projects_view")
      .select("city")
      .not("city", "is", null)
      .neq("city", city)
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .limit(2000),
  ]);

  const forSale = (saleRes.data ?? []) as Row[];
  const saleCount = saleRes.count ?? forSale.length;
  const rentalCount = rentalRes.count ?? 0;
  if (forSale.length === 0 && rentalCount === 0) notFound();

  const allSale = (allSaleRes.data ?? []) as Row[];
  const province = forSale[0]?.province ?? null;
  const currency = allSale.find((r) => r.price_currency)?.price_currency ?? "CAD";
  const regionLabel = regionForProvince(province)?.label ?? province ?? "";

  // ---- Data modules (live, always true) ----------------------------------
  const prices = allSale.map((r) => r.price_from_public).filter((n): n is number => n != null);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = allSale
    .map((r) => r.price_to_public ?? r.price_from_public)
    .filter((n): n is number => n != null);
  const priceCeil = priceMax.length ? Math.max(...priceMax) : null;

  const typeCount = (k: string) => allSale.filter((r) => r.project_type === k).length;
  const bandCount = (b: { min?: number; max?: number }) =>
    allSale.filter((r) => {
      const p = r.price_from_public;
      if (p == null) return false;
      if (b.min != null && p < b.min) return false;
      if (b.max != null && p >= b.max) return false;
      return true;
    }).length;

  const builderCounts = new Map<string, number>();
  for (const r of allSale) {
    if (!r.builder_name) continue;
    const primary = r.builder_name.split(/,| and /i)[0].trim();
    if (primary) builderCounts.set(primary, (builderCounts.get(primary) ?? 0) + 1);
  }
  const topBuilders = [...builderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Nearby cities (same region) for the internal-link mesh.
  const otherCityCounts = new Map<string, number>();
  for (const r of (otherCitiesRes.data ?? []) as { city: string }[]) {
    otherCityCounts.set(r.city, (otherCityCounts.get(r.city) ?? 0) + 1);
  }
  const nearbyCities = [...otherCityCounts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // ---- Schema ------------------------------------------------------------
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
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "New homes", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: city, item: `${SITE_URL}/new-homes/${slug}` },
    ],
  };
  const faqSchema =
    hub?.faq && hub.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: hub.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;
  const schemaBlocks = [itemList, breadcrumb, ...(faqSchema ? [faqSchema] : [])];

  const priceRangeLabel =
    priceMin != null && priceCeil != null
      ? `${money(priceMin, currency)} – ${money(priceCeil, currency)}`
      : priceMin != null
        ? `from ${money(priceMin, currency)}`
        : "—";

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      {schemaBlocks.map((b, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }}
        />
      ))}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-ink hover:underline">New homes</Link>
        <span aria-hidden className="mx-1.5 text-slate-300">/</span>
        <span aria-current="page" className="font-medium text-slate-700">{city}</span>
      </nav>

      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        New homes &amp; pre-construction in {city}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        {saleCount} active development{saleCount === 1 ? "" : "s"} in {city}
        {regionLabel ? `, ${regionLabel}` : ""} — get pricing, floor plans, and first
        access before the public.
      </p>

      {/* Market snapshot — live, unique per city */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active developments" value={String(saleCount)} />
        <Stat label="Starting-price range" value={priceRangeLabel} />
        <Stat
          label="Home types"
          value={TYPE_LABELS.filter((t) => typeCount(t.key) > 0).length.toString() + " types"}
        />
        <Stat label="Active builders" value={String(builderCounts.size)} />
      </div>

      {/* Shop by home type + price band — internal links into filtered browse */}
      <div className="mt-6 flex flex-wrap gap-2">
        {TYPE_LABELS.filter((t) => typeCount(t.key) > 0).map((t) => (
          <Link
            key={t.key}
            href={`/?city=${encodeURIComponent(city)}&type=${t.key}`}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
          >
            {t.label} ({typeCount(t.key)})
          </Link>
        ))}
        {PRICE_BANDS.map((b) => {
          const n = bandCount(b);
          if (n === 0) return null;
          const qs = new URLSearchParams({ city });
          if (b.min != null) qs.set("min", String(b.min));
          if (b.max != null) qs.set("max", String(b.max));
          return (
            <Link
              key={b.label}
              href={`/?${qs.toString()}`}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
            >
              {b.label} ({n})
            </Link>
          );
        })}
      </div>

      {/* Market overview prose (cached; only present past the inventory gate) */}
      {hub?.intro ? (
        <section className="mt-10 max-w-3xl">
          <Prose text={hub.intro} />
        </section>
      ) : null}

      {/* Project grid */}
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {forSale.map((p) => {
          const band = formatPriceBand(p.price_from_public, p.price_to_public, {
            currency: p.price_currency,
          });
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
                  <h2 className="mt-2 line-clamp-2 font-semibold text-ink">{p.project_name}</h2>
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
          <ButtonLink href={`/new-homes/${slug}?page=${pageNum + 1}`} scroll={false} variant="secondary">
            Load more ({saleCount - forSale.length} remaining)
          </ButtonLink>
        </div>
      ) : null}

      {/* Builders active here — internal links to builder hubs */}
      {topBuilders.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold text-ink">Builders active in {city}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {topBuilders.map(([b, n]) => (
              <Link
                key={b}
                href={`/builders/${plainSlug(b)}`}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700"
              >
                {b} ({n})
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Deep content — accordions (indexed, uncluttered) */}
      {hub && (hub.investor || hub.first_time || hub.how_it_works) ? (
        <section className="mt-14 max-w-3xl">
          <h2 className="mb-2 text-xl font-semibold text-ink">
            Buying new construction in {city}
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white px-5">
            {hub.how_it_works ? (
              <Accordion title={`How buying pre-construction works in ${city}`} defaultOpen>
                <Prose text={hub.how_it_works} />
              </Accordion>
            ) : null}
            {hub.investor ? (
              <Accordion title={`For investors: what matters in ${city}`}>
                <Prose text={hub.investor} />
              </Accordion>
            ) : null}
            {hub.first_time ? (
              <Accordion title="For first-time buyers">
                <Prose text={hub.first_time} />
              </Accordion>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* FAQ — accordions + FAQPage schema above */}
      {hub?.faq && hub.faq.length > 0 ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-3 text-xl font-semibold text-ink">
            {city} new-construction: common questions
          </h2>
          <HubFaq faq={hub.faq} />
        </section>
      ) : null}

      {rentalCount > 0 ? (
        <p className="mt-10 text-sm text-slate-600">
          Also in {city}:{" "}
          <Link href={`/rentals?city=${encodeURIComponent(city)}`} className="font-medium text-brand-700 hover:underline">
            {rentalCount} new rental building{rentalCount === 1 ? "" : "s"} →
          </Link>
        </p>
      ) : null}

      {/* Nearby cities — sibling-hub internal-link mesh */}
      {nearbyCities.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            New homes in nearby cities
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {nearbyCities.map(([c, n]) => (
              <Link
                key={c}
                href={`/new-homes/${plainSlug(c)}`}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                {c} ({n})
              </Link>
            ))}
          </div>
        </section>
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
