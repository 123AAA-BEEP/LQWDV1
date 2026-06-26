import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { formatPriceBand } from "@/lib/types";
import type { PublicProject, RealtorCard } from "@/lib/types";
import { TITLE_LABELS } from "@/lib/types";
import { NeighbourhoodBlock } from "@/components/projects/neighbourhood-block";
import { LeadForm } from "./lead-form";

export const dynamic = "force-dynamic";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Project not found" };
  return {
    title: project.seo_title ?? project.project_name,
    description: project.seo_meta_description ?? project.page_summary ?? undefined,
    alternates: project.canonical_url
      ? { canonical: project.canonical_url }
      : undefined,
  };
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
  const intro =
    project.section_intro ??
    project.page_description ??
    project.description_long;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
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
          {project.neighbourhood_features ? (
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
        </div>

        {/* Sidebar: lead form + realtor card */}
        <div className="space-y-6">
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold text-ink">
                Request information
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Get details on pricing, floorplans, and availability.
              </p>
              <div className="mt-4">
                <LeadForm
                  projectId={project.project_id}
                  publicPageId={project.public_page_id}
                  ctaText={project.custom_cta_text ?? "Request information"}
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
        <section className="mt-12 border-t border-slate-200 pt-10">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            More from {project.builder_name}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {moreFromBuilder.map((m) => (
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
      ) : null}
    </div>
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
