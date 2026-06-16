import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPriceBand } from "@/lib/types";
import type { PublicProject, PublicProjectCard } from "@/lib/types";

const CARD_COLUMNS =
  "project_id, slug, project_name, builder_name, city, neighbourhood, hero_image_url, price_from_public, price_to_public";

/**
 * Related-projects modules shown at the bottom of a public project page.
 *
 *  - "More from this developer" — always on. Keeps the lead in-house and adds
 *    internal links between the developer's own pages (good for SEO).
 *  - "Similar properties nearby" — admin/advertiser-gated via
 *    `show_similar_block`. Surfaces COMPETING developers (paying ones first),
 *    so free listings funnel leads to advertisers while paid listings stay
 *    competitor-free.
 */
export async function SimilarProperties({
  project,
}: {
  project: PublicProject;
}) {
  const supabase = await createClient();

  // More from this developer (always on when a builder is known).
  const fromDeveloperPromise = project.builder_name
    ? supabase
        .from("public_projects_view")
        .select(CARD_COLUMNS)
        .eq("builder_name", project.builder_name)
        .neq("project_id", project.project_id)
        .limit(3)
    : null;

  // Similar nearby — competing developers, advertisers first. Gated.
  const similarPromise =
    project.show_similar_block && project.city
      ? (() => {
          let q = supabase
            .from("public_projects_view")
            .select(CARD_COLUMNS)
            .eq("city", project.city)
            .neq("project_id", project.project_id);
          // Exclude this project's own developer so this block is competitive.
          if (project.builder_name) {
            q = q.neq("builder_name", project.builder_name);
          }
          return q
            .order("is_advertiser", { ascending: false })
            .order("is_featured", { ascending: false })
            .order("published_at", { ascending: false })
            .limit(4);
        })()
      : null;

  const [fromDeveloperRes, similarRes] = await Promise.all([
    fromDeveloperPromise,
    similarPromise,
  ]);

  const fromDeveloper = (fromDeveloperRes?.data ?? []) as PublicProjectCard[];
  const similar = (similarRes?.data ?? []) as PublicProjectCard[];

  if (fromDeveloper.length === 0 && similar.length === 0) return null;

  return (
    <div className="mt-16 space-y-12 border-t border-slate-200 pt-12">
      {fromDeveloper.length > 0 ? (
        <RelatedSection
          title={`More from ${project.builder_name}`}
          projects={fromDeveloper}
        />
      ) : null}
      {similar.length > 0 ? (
        <RelatedSection
          title={
            project.city
              ? `Similar new homes in ${project.city}`
              : "Similar new homes"
          }
          projects={similar}
        />
      ) : null}
    </div>
  );
}

function RelatedSection({
  title,
  projects,
}: {
  title: string;
  projects: PublicProjectCard[];
}) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <li key={p.project_id}>
            <RelatedCard project={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedCard({ project }: { project: PublicProjectCard }) {
  const priceBand = formatPriceBand(
    project.price_from_public,
    project.price_to_public,
  );
  const location = [project.neighbourhood, project.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="aspect-[16/10] bg-slate-100">
        {project.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.hero_image_url}
            alt={project.project_name}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        {project.builder_name ? (
          <p className="text-xs font-medium text-brand-700">
            {project.builder_name}
          </p>
        ) : null}
        <p className="mt-0.5 font-semibold text-ink group-hover:text-brand-700">
          {project.project_name}
        </p>
        {location ? (
          <p className="mt-0.5 text-sm text-slate-500">{location}</p>
        ) : null}
        {priceBand ? (
          <p className="mt-2 text-sm font-medium text-slate-800">{priceBand}</p>
        ) : null}
      </div>
    </Link>
  );
}
