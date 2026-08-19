import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import {
  getMicrositeByDomain,
  getMicrositeProject,
  isPrimaryHost,
  MICROSITE_SUBPAGES,
  type MicrositeConfig,
  type MicrositeSubPageKey,
} from "@/lib/microsites";
import type { PublicProject } from "@/lib/types";
import { recordPageEvent } from "@/lib/analytics";
import { renderMarkdown } from "@/lib/markdown";
import { MicrositeLeadForm } from "./lead-form";

/**
 * Shared machinery for microsite sub-pages (/floor-plans, /pricing,
 * /neighbourhood) — the multi-page depth that makes organic sitelinks
 * possible. Each route file is two lines: metadata + page from these
 * factories. Same SEO contract as the home page: live + content only,
 * noindex holding page otherwise.
 */

export interface LiveMicrosite {
  config: MicrositeConfig;
  project: PublicProject;
}

export async function loadLiveMicrosite(
  domain: string,
): Promise<LiveMicrosite | null> {
  const config = await getMicrositeByDomain(domain);
  if (!config || config.status !== "live" || !config.content) return null;
  const project = await getMicrositeProject(config.project_id);
  return project ? { config, project } : null;
}

export function MicrositeFooter({
  slug,
  links,
  name,
  primary,
}: {
  /** The grounding project's liqwd.ca slug. */
  slug: string;
  /** Site navigation — the founder wants nav in the footer, not the hero. */
  links?: { href: string; label: string }[];
  /** Project wordmark shown in the footer. */
  name?: string;
  /** Brand colour for the accent bar. */
  primary?: string;
}) {
  return (
    <footer className="bg-ink text-slate-300">
      <div
        className="h-1 w-full"
        style={{ backgroundColor: primary ?? "#0d9488" }}
      />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-start justify-between gap-8">
          {name ? (
            <p className="text-2xl font-semibold tracking-tight text-white">
              {name}
            </p>
          ) : null}
          {links?.length ? (
            <nav aria-label="Site links" className="max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Useful links
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2.5 text-sm">
                {links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    className="transition-colors hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </nav>
          ) : null}
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-slate-400">
          Independent information page operated by LIQWD. This is not the
          builder&apos;s official website. Details reflect publicly available
          information and change as the project progresses, so confirm
          everything with the builder&apos;s sales team. Renderings are the
          builder&apos;s marketing material.{" "}
          <a
            href={`https://liqwd.ca/projects/${slug}`}
            className="underline transition-colors hover:text-white"
          >
            See the full listing on LIQWD
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

const HOLDING = (
  <main className="flex min-h-screen items-center justify-center bg-white px-6">
    <div className="max-w-md text-center">
      <p className="text-3xl font-semibold tracking-tight text-ink">
        Coming soon
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">
        Details for this new-construction project are being prepared. Check
        back shortly.
      </p>
    </div>
  </main>
);

export function subpageMetadata(pageKey: MicrositeSubPageKey) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ domain: string }>;
  }): Promise<Metadata> {
    const { domain } = await params;
    const live = await loadLiveMicrosite(domain);
    const page = live?.config.content?.pages?.[pageKey];
    const def = MICROSITE_SUBPAGES.find((p) => p.key === pageKey);
    if (!live || !page || !def) {
      return { title: "Coming soon", robots: { index: false, follow: false } };
    }
    return {
      title: page.seo_title,
      description: page.meta_description,
      alternates: { canonical: `https://${live.config.domain}/${def.slug}` },
      openGraph: {
        title: page.seo_title,
        description: page.meta_description,
        ...(live.project.hero_image_url
          ? { images: [live.project.hero_image_url] }
          : {}),
      },
    };
  };
}

export function makeSubpage(pageKey: MicrositeSubPageKey) {
  return async function MicrositeSubpage({
    params,
  }: {
    params: Promise<{ domain: string }>;
  }) {
    const { domain } = await params;
    const h = await headers();
    if (isPrimaryHost((h.get("host") ?? "").toLowerCase())) notFound();

    const live = await loadLiveMicrosite(domain);
    if (!live) return HOLDING;
    const page = live.config.content?.pages?.[pageKey];
    const def = MICROSITE_SUBPAGES.find((p) => p.key === pageKey);
    // Config predates multi-page content: send the visitor to the home page
    // rather than serving a thin shell (regenerate to fill the sub-pages).
    if (!page || !def) redirect("/");

    const { config, project } = live;
    const c = config.content!;
    const brand = c.brand ?? null;
    const primary = brand?.primary ?? "#0d9488";
    const fontFamily = brand
      ? `'${brand.heading_font}', ${brand.font_stack}`
      : undefined;
    const fontHref = brand
      ? `https://fonts.googleapis.com/css2?family=${brand.heading_font.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`
      : null;

    await recordPageEvent("page_view", "project", {
      publicProjectPageId: project.public_page_id,
      utm: { source: config.domain, medium: "microsite", campaign: def.slug },
    });

    const others = MICROSITE_SUBPAGES.filter(
      (p) => p.key !== pageKey && c.pages?.[p.key],
    );

    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: project.project_name,
            item: `https://${config.domain}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: def.label,
            item: `https://${config.domain}/${def.slug}`,
          },
        ],
      },
      page.faq.length
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faq.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }
        : null,
    ].filter(Boolean);

    return (
      <main
        className="min-h-screen bg-white"
        style={fontFamily ? { fontFamily } : undefined}
      >
        {fontHref ? (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin="anonymous"
            />
            <link rel="stylesheet" href={fontHref} />
          </>
        ) : null}
        {jsonLd.map((block, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
          />
        ))}

        {/* Slim site header */}
        <header className="border-b border-slate-100">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
            {/* Plain <a>, not <Link>: on a microsite domain, client routing
                would resolve "/" inside the app tree (liqwd.ca home) instead
                of re-entering through the proxy's host rewrite. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="font-semibold tracking-tight text-ink">
              {project.project_name}
            </a>
            <nav className="flex items-center gap-4 text-sm text-slate-500">
              {others.map((p) => (
                <a key={p.slug} href={`/${p.slug}`} className="hover:text-brand-700">
                  {p.label}
                </a>
              ))}
              <a
                href="#register"
                className="rounded-lg px-4 py-2 font-semibold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: primary }}
              >
                Register
              </a>
            </nav>
          </div>
        </header>

        {project.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.hero_image_url}
            alt={project.hero_image_alt ?? project.project_name}
            className="h-56 w-full object-cover"
          />
        ) : null}

        <div className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {page.heading}
          </h1>
          <div
            className="mt-4"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(page.intro_md) }}
          />

          {page.sections.map((s) => (
            <section key={s.title} className="mt-10">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                {s.title}
              </h2>
              <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }} />
            </section>
          ))}

          {page.faq.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-2xl font-semibold tracking-tight text-ink">
                Common questions
              </h2>
              <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
                {page.faq.map((f) => (
                  <details key={f.question} className="group px-5 py-4">
                    <summary className="cursor-pointer list-none font-medium text-slate-800 group-open:text-brand-700">
                      {f.question}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {/* Register */}
          <section
            id="register"
            className="mt-14 scroll-mt-16 rounded-3xl border p-6 sm:p-8"
            style={{ backgroundColor: `${primary}0d`, borderColor: `${primary}2e` }}
          >
            <h2
              className="text-2xl font-semibold tracking-tight"
              style={{ color: primary }}
            >
              Register Now
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Get available floor plans, pricing and details.
            </p>
            <div className="mt-5">
              <MicrositeLeadForm
                idPrefix={def.slug}
                domain={config.domain}
                captureKey={config.capture_key}
                ctaLabel="Register Now"
                accentColor={primary}
              />
            </div>
          </section>

          {/* Cross-links */}
          <nav className="mt-10 text-sm text-slate-500" aria-label="More pages">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- must re-enter via the host rewrite */}
            <a href="/" className="hover:text-brand-700">
              ← {project.project_name} overview
            </a>
            {others.map((p) => (
              <span key={p.slug}>
                {" · "}
                <a href={`/${p.slug}`} className="hover:text-brand-700">
                  {p.label}
                </a>
              </span>
            ))}
          </nav>
        </div>

        <MicrositeFooter
          slug={project.slug}
          name={project.project_name}
          primary={primary}
          links={[
            { href: "/", label: `${project.project_name} overview` },
            ...others.map((p) => ({ href: `/${p.slug}`, label: p.label })),
            { href: "#register", label: "Register Now" },
          ]}
        />
      </main>
    );
  };
}
