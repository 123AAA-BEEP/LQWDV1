import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardImage } from "@/components/public/card-image";
import { Prose, Accordion, HubFaq, Stat } from "@/components/public/hub-sections";
import { plainSlug } from "@/lib/slug";
import { formatPriceBand } from "@/lib/types";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * Programmatic builder hubs — /builders/mattamy-homes, … They rank for
 * "{builder} new homes / pre-construction" searches and, because builders
 * sometimes link to a page that aggregates their projects, can attract
 * external authority. Data (project list, cities, types) is live; prose is
 * cached in seo_hub_content and only present for builders past the gate.
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

/** Resolve a builder slug back to the canonical primary builder name. */
async function resolveBuilder(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("builder_name")
    .not("builder_name", "is", null)
    .limit(3000);
  const names = new Set<string>();
  for (const r of (data ?? []) as { builder_name: string }[]) {
    const primary = r.builder_name.split(/,| and /i)[0].trim();
    if (primary) names.add(primary);
  }
  return [...names].find((n) => plainSlug(n) === slug) ?? null;
}

async function getHubContent(slug: string): Promise<HubContentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("seo_hub_content")
    .select("intro, investor, first_time, how_it_works, faq, meta_title, meta_description")
    .eq("hub_type", "builder")
    .eq("slug", slug)
    .maybeSingle();
  return (data as HubContentRow) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const builder = await resolveBuilder(slug);
  if (!builder) return { title: "Builder not found" };
  const hub = await getHubContent(slug);
  return {
    title: hub?.meta_title || `${builder} — New Homes & Pre-Construction`,
    description:
      hub?.meta_description ||
      `New and pre-construction homes by ${builder} — active projects, pricing, and first access on LIQWD.`,
    alternates: { canonical: `/builders/${slug}` },
  };
}

export default async function BuilderHubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const builder = await resolveBuilder(slug);
  if (!builder) notFound();

  const supabase = await createClient();
  const [projRes, hub] = await Promise.all([
    supabase
      .from("public_projects_view")
      .select(
        "slug, project_name, builder_name, city, province, project_type, sales_status, price_from_public, price_to_public, price_currency, hero_image_url, listing_type",
      )
      .ilike("builder_name", `${builder}%`)
      .or("listing_type.is.null,listing_type.neq.for_rent")
      .order("published_at", { ascending: false })
      .limit(200),
    getHubContent(slug),
  ]);

  // Keep only rows whose PRIMARY builder is this one (ilike-prefix can catch
  // "Mattamy Homes East" etc. — accept those, they're the same builder).
  const projects = ((projRes.data ?? []) as Row[]).filter((r) => {
    const primary = (r.builder_name ?? "").split(/,| and /i)[0].trim();
    return plainSlug(primary) === slug || primary.toLowerCase().startsWith(builder.toLowerCase());
  });
  if (projects.length === 0) notFound();

  const cities = [...new Set(projects.map((p) => p.city).filter(Boolean) as string[])];
  const typeCount = (k: string) => projects.filter((p) => p.project_type === k).length;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `New homes by ${builder}`,
    itemListElement: projects.slice(0, 25).map((p, i) => ({
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
      { "@type": "ListItem", position: 2, name: "Builders", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 3, name: builder, item: `${SITE_URL}/builders/${slug}` },
    ],
  };
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: builder,
    url: `${SITE_URL}/builders/${slug}`,
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
  const schemaBlocks = [itemList, breadcrumb, orgSchema, ...(faqSchema ? [faqSchema] : [])];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      {schemaBlocks.map((b, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(b) }} />
      ))}

      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-ink hover:underline">New homes</Link>
        <span aria-hidden className="mx-1.5 text-slate-300">/</span>
        <span aria-current="page" className="font-medium text-slate-700">{builder}</span>
      </nav>

      <h1 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
        {builder}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        {projects.length} active development{projects.length === 1 ? "" : "s"} by {builder}
        {cities.length ? ` across ${cities.slice(0, 4).join(", ")}${cities.length > 4 ? " and more" : ""}` : ""}.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active projects" value={String(projects.length)} />
        <Stat label="Cities" value={String(cities.length)} />
        {typeCount("condo") > 0 ? <Stat label="Condos" value={String(typeCount("condo"))} /> : null}
        {typeCount("townhouse") > 0 ? <Stat label="Townhomes" value={String(typeCount("townhouse"))} /> : null}
        {typeCount("single_family") > 0 ? <Stat label="Single-family" value={String(typeCount("single_family"))} /> : null}
      </div>

      {hub?.intro ? (
        <section className="mt-10 max-w-3xl">
          <Prose text={hub.intro} />
        </section>
      ) : null}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
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
                    {p.city ? <Badge tone="neutral">{p.city}</Badge> : null}
                  </div>
                  <h2 className="mt-2 line-clamp-2 font-semibold text-ink">{p.project_name}</h2>
                  {band ? <p className="mt-2 text-sm font-medium text-slate-700">{band}</p> : null}
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {hub && (hub.how_it_works || hub.investor || hub.first_time) ? (
        <section className="mt-14 max-w-3xl">
          <h2 className="mb-2 text-xl font-semibold text-ink">Buying a {builder} pre-construction home</h2>
          <div className="rounded-2xl border border-slate-200 bg-white px-5">
            {hub.how_it_works ? (
              <Accordion title="How buying pre-construction works" defaultOpen>
                <Prose text={hub.how_it_works} />
              </Accordion>
            ) : null}
            {hub.investor ? (
              <Accordion title="For investors: what to evaluate">
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

      {hub?.faq && hub.faq.length > 0 ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="mb-3 text-xl font-semibold text-ink">Common questions</h2>
          <HubFaq faq={hub.faq} />
        </section>
      ) : null}

      {cities.length > 0 ? (
        <section className="mt-12 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {builder} builds in
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c}
                href={`/new-homes/${plainSlug(c)}`}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
