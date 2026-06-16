import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { formatPriceBand } from "@/lib/types";
import type { PublicProject, RealtorCard } from "@/lib/types";
import { TITLE_LABELS } from "@/lib/types";
import { LeadForm } from "./lead-form";
import { SimilarProperties } from "./similar";

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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
          {project.page_description ?? project.description_long ? (
            <p className="mt-4 leading-relaxed text-slate-600">
              {project.page_description ?? project.description_long}
            </p>
          ) : null}

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

      <SimilarProperties project={project} />
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
