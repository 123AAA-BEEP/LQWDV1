import type { Metadata } from "next";
import {
  getMicrositeByDomain,
  getMicrositeProject,
  getMicrositeGallery,
  getMicrositeStock,
  isPrimaryHost,
} from "@/lib/microsites";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { recordPageEvent } from "@/lib/analytics";
import { MicrositeSiteView } from "./site-view";

export const dynamic = "force-dynamic";

/**
 * Public microsite route — served on the site's own domain via the proxy's
 * host rewrite. The page itself lives in MicrositeSiteView (shared with the
 * admin preview). SEO contract enforced here: only `live` configs render
 * (and index); anything else gets a minimal noindex holding page so a
 * freshly-attached domain NEVER mirrors liqwd.ca.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string }>;
}): Promise<Metadata> {
  const { domain } = await params;
  const config = await getMicrositeByDomain(domain);
  if (!config || config.status !== "live" || !config.content) {
    return { title: "Coming soon", robots: { index: false, follow: false } };
  }
  const project = await getMicrositeProject(config.project_id);
  const name = project?.project_name ?? config.content.headline;
  const title =
    config.content.seo_title ||
    `${name}${project?.city ? ` in ${project.city}` : ""} | Pricing, Floor Plans & Launch Details`;
  const description = config.content.seo_description || config.content.subhead;
  return {
    title,
    description,
    alternates: { canonical: `https://${config.domain}/` },
    openGraph: {
      title,
      description,
      ...(project?.hero_image_url ? { images: [project.hero_image_url] } : {}),
    },
  };
}

export default async function MicrositePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  // Belt-and-braces: this tree only serves rewritten foreign hosts.
  const h = await headers();
  if (isPrimaryHost((h.get("host") ?? "").toLowerCase())) notFound();

  const config = await getMicrositeByDomain(domain);
  const project = config ? await getMicrositeProject(config.project_id) : null;

  if (!config || config.status !== "live" || !config.content || !project) {
    // Holding page: noindex (via metadata above), zero liqwd.ca content.
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <p className="text-3xl font-semibold tracking-tight text-ink">
            Coming soon
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Details for this new-construction project are being prepared.
            Check back shortly.
          </p>
        </div>
      </main>
    );
  }

  await recordPageEvent("page_view", "project", {
    publicProjectPageId: project.public_page_id,
    utm: { source: config.domain, medium: "microsite" },
  });

  const [gallery, stock] = await Promise.all([
    getMicrositeGallery(project.project_id),
    getMicrositeStock(),
  ]);
  return (
    <MicrositeSiteView
      config={config}
      project={project}
      gallery={gallery}
      stock={stock}
    />
  );
}
