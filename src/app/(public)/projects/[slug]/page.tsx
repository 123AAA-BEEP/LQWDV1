import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { formatPriceBand } from "@/lib/types";
import type { PublicProject, RealtorCard } from "@/lib/types";
import { TITLE_LABELS } from "@/lib/types";
import {
  NeighbourhoodBlock,
  hasNeighbourhood,
} from "@/components/projects/neighbourhood-block";
import { LeadForm } from "./lead-form";
import { StickyCta } from "./sticky-cta";

export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

async function getProject(slug: string): Promise<PublicProject | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as PublicProject) ?? null;
}

async function getRealtorCard(
  profileId: string | null,
): Promise<RealtorCard | null> {
  if (!profileId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_realtor_cards")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  return (data as RealtorCard) ?? null;
}

interface MiniProject {
  project_id: string;
  slug: string;
  project_name: string;
  city: string | null;
  hero_image_url: string | null;
}

/** Other published projects by the same builder — internal links for SEO. */
async function getMoreFromBuilder(
  builder: string | null,
  excludeId: string,
): Promise<MiniProject[]> {
  if (!builder) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("project_id, slug, project_name, city, hero_image_url")
    .eq("builder_name", builder)
    .neq("project_id", excludeId)
    .not("hero_image_url", "is", null)
    .limit(3);
  return (data as MiniProject[] | null) ?? [];
}

/** Nearby published projects (same city) — the internal-link mesh Google
 *  follows to discover new pages, and where visitors go next. */
async function getNearbyProjects(
  city: string | null,
  excludeIds: string[],
): Promise<MiniProject[]> {
  if (!city) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_projects_view")
    .select("project_id, slug, project_name, city, hero_image_url")
    .ilike("city", city)
    .not("hero_image_url", "is", null)
    .order("published_at", { ascending: false })
    .limit(10);
  const exclude = new Set(excludeIds);
  return ((data as MiniProject[] | null) ?? [])
    .filter((p) => !exclude.has(p.project_id))
    .slice(0, 3);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  const title = project.seo_title ?? project.project_name;
  const description =
    project.seo_meta_description ?? project.page_summary ?? undefined;
  const pageUrl = `${SITE_URL}/projects/${project.slug}`;
  return {
    title,
    description,
    alternates: { canonical: project.canonical_url ?? pageUrl },
    robots: project.indexable === false ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "LIQWD",
      type: "website",
      locale: "en_CA",
      images: project.hero_image_url
        ? [{ url: project.hero_image_url, alt: project.project_name }]
        : undefined,
    },
    twitter: {
      card: project.hero_image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: project.hero_image_url ? [project.hero_image_url] : undefined,
    },
  };
}

/** schema.org structured data: the residence + offer, breadcrumbs, and FAQ. */
function jsonLd(project: PublicProject): object[] {
  const pageUrl = `${SITE_URL}/projects/${project.slug}`;
  const blocks: object[] = [];

  const residence: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type":
      project.project_type === "condo" ? "ApartmentComplex" : "Residence",
    name: project.project_name,
    url: pageUrl,
    description:
      project.seo_meta_description ?? project.page_summary ?? undefined,
    image: project.hero_image_url ?? undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: project.city ?? undefined,
      addressRegion: project.province ?? "ON",
      addressCountry: "CA",
    },
  };
  if (project.latitude && project.longitude) {
    residence.geo = {
      "@type": "GeoCoordinates",
      latitude: project.latitude,
      longitude: project.longitude,
    };
  }
  if (project.total_units) residence.numberOfAccommodationUnits = project.total_units;
  blocks.push(residence);

  if (project.price_from_public) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "Product",
      name: `New homes at ${project.project_name}`,
      url: pageUrl,
      image: project.hero_image_url ?? undefined,
      brand: project.builder_name
        ? { "@type": "Organization", name: project.builder_name }
        : undefined,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: project.price_currency ?? "CAD",
        lowPrice: project.price_from_public,
        highPrice: project.price_to_public ?? project.price_from_public,
        url: pageUrl,
        availability: "https://schema.org/PreOrder",
      },
    });
  }

  blocks.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "New homes", item: `${SITE_URL}/projects` },
      ...(project.city
        ? [{
            "@type": "ListItem",
            position: 2,
            name: project.city,
            item: `${SITE_URL}/projects?q=${encodeURIComponent(project.city)}`,
          }]
        : []),
      {
        "@type": "ListItem",
        position: project.city ? 3 : 2,
        name: project.project_name,
        item: pageUrl,
      },
    ],
  });

  if (project.section_faq && project.section_faq.length > 0) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: project.section_faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return blocks;
}

export default async function PublicProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const project = await getProject(slug);
  if (!project) notFound();

  const realtor = await getRealtorCard(project.assigned_realtor_profile_id);
  const priceBand = formatPriceBand(
    project.price_from_public,
    project.price_to_public,
  );
  const location = [project.neighbourhood, project.city, project.province]
    .filter(Boolean)
    .join(", ");
  const moreFromBuilder = await getMoreFromBuilder(
    project.builder_name,
    project.project_id,
  );
  const nearby = await getNearbyProjects(project.city, [
    project.project_id,
    ...moreFromBuilder.map((m) => m.project_id),
  ]);
  const intro =
    project.section_intro ??
    project.page_description ??
    project.description_long;
  const faq = project.section_faq ?? [];
  const ctaLabel = project.custom_cta_text ?? "Get price list & floor plans";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 pb-24 lg:pb-10">
      {/* Structured data for rich results + AI search */}
      {jsonLd(project).map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {project.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.hero_image_url}
            alt={project.project_name}
            className="h-72 w-full object-cover sm:h-96"
          />
        ) : (
          <div className="flex h-72 items-center justify-center text-slate-400 sm:h-96">
            No image available
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {project.builder_name ? (
            <p className="text-sm font-medium text-brand-700">
              {project.builder_name}
            </p>
          ) : null}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink">
            {project.project_name}
          </h1>
          {location ? (
            <p className="mt-1 text-slate-500">{location}</p>
          ) : null}

          {project.headline ? (
            <p className="mt-6 text-lg text-slate-700">{project.headline}</p>
          ) : null}
          {intro ? <Prose text={intro} className="mt-4" /> : null}

          {/* Public-safe facts */}
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {priceBand ? (
              <Fact label="Pricing" value={priceBand} />
            ) : null}
            {project.occupancy_estimate_text ? (
              <Fact label="Occupancy" value={project.occupancy_estimate_text} />
            ) : null}
            {project.bedrooms_summary ? (
              <Fact label="Suites" value={project.bedrooms_summary} />
            ) : null}
            {project.storeys ? (
              <Fact label="Storeys" value={String(project.storeys)} />
            ) : null}
            {project.total_units ? (
              <Fact label="Units" value={String(project.total_units)} />
            ) : null}
            {project.size_range_sqft_min && project.size_range_sqft_max ? (
              <Fact
                label="Size range"
                value={`${project.size_range_sqft_min}–${project.size_range_sqft_max} sq ft`}
              />
            ) : null}
          </dl>

          <Section title="Local amenities" text={project.section_amenities} />
          <Section
            title="Getting around"
            text={project.section_getting_around}
          />
          {hasNeighbourhood(project.neighbourhood_features) ? (
            <section className="mt-8">
              <NeighbourhoodBlock
                features={project.neighbourhood_features}
                title="The neighbourhood"
              />
            </section>
          ) : null}
          <Section
            title={`About ${project.builder_name ?? "the developer"}`}
            text={project.section_developer}
          />
          <Section
            title={`Buying pre-construction at ${project.project_name}`}
            text={project.section_buying}
          />

          {/* FAQ — on-page answers + FAQPage schema above */}
          {faq.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-xl font-semibold tracking-tight text-ink">
                Frequently asked questions
              </h2>
              <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {faq.map((f, i) => (
                  <div key={i} className="px-5 py-4">
                    <h3 className="font-medium text-slate-800">{f.question}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                      {f.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {project.page_updated_at ? (
            <p className="mt-8 text-xs text-slate-400">
              Information last updated{" "}
              {new Date(project.page_updated_at).toLocaleDateString("en-CA", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              . Details are provided by the builder and may change without
              notice.
            </p>
          ) : null}
        </div>

        {/* Sidebar: lead form + realtor card */}
        <div className="space-y-6">
          <Card id="request-info" className="scroll-mt-24">
            <CardBody>
              <h2 className="text-lg font-semibold text-ink">
                Get the price list &amp; floor plans
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                First access to pricing, floorplans, and availability — before
                the public.
              </p>
              <div className="mt-4">
                <LeadForm
                  projectId={project.project_id}
                  publicPageId={project.public_page_id}
                  ctaText={ctaLabel}
                  refCode={ref}
                />
              </div>
            </CardBody>
          </Card>

          {realtor ? (
            <Card>
              <CardBody>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Your representative
                </p>
                <p className="mt-2 font-semibold text-ink">
                  {[realtor.first_name, realtor.last_name]
                    .filter(Boolean)
                    .join(" ")}
                </p>
                {realtor.title ? (
                  <p className="text-sm text-slate-500">
                    {TITLE_LABELS[realtor.title]}
                  </p>
                ) : null}
                {realtor.brokerage ? (
                  <p className="text-sm text-slate-500">{realtor.brokerage}</p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      {moreFromBuilder.length > 0 ? (
        <MiniGrid
          title={`More from ${project.builder_name}`}
          projects={moreFromBuilder}
        />
      ) : null}

      {nearby.length > 0 ? (
        <MiniGrid
          title={`More new homes in ${project.city}`}
          projects={nearby}
        />
      ) : null}

      {/* Agent capture: every public page quietly recruits realtors too. */}
      <p className="mt-12 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
        Are you a real estate agent?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Get commission details &amp; broker portal access on LIQWD →
        </Link>
      </p>

      <StickyCta label={ctaLabel} />
    </div>
  );
}

/** A compact internal-link grid of related projects. */
function MiniGrid({
  title,
  projects,
}: {
  title: string;
  projects: MiniProject[];
}) {
  return (
    <section className="mt-12 border-t border-slate-200 pt-10">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((m) => (
          <Link key={m.slug} href={`/projects/${m.slug}`}>
            <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
              <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                {m.hero_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.hero_image_url}
                    alt={m.project_name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <CardBody>
                <h3 className="font-semibold text-ink">{m.project_name}</h3>
                {m.city ? (
                  <p className="text-sm text-slate-500">{m.city}</p>
                ) : null}
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd>
    </div>
  );
}

/** Renders double-newline-separated text as paragraphs. */
function Prose({ text, className = "" }: { text: string; className?: string }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className={`space-y-4 leading-relaxed text-slate-600 ${className}`}>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** An optional editorial section (renders nothing when the text is empty). */
function Section({ title, text }: { title: string; text: string | null }) {
  if (!text || !text.trim()) return null;
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <Prose text={text} className="mt-3" />
    </section>
  );
}
