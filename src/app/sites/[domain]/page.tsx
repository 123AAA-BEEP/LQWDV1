import type { Metadata } from "next";
import {
  getMicrositeByDomain,
  getMicrositeProject,
  isPrimaryHost,
} from "@/lib/microsites";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { recordPageEvent } from "@/lib/analytics";
import { renderMarkdown } from "@/lib/markdown";
import { formatPriceBand } from "@/lib/types";
import { MicrositeLeadForm } from "./lead-form";

export const dynamic = "force-dynamic";

/**
 * The microsite renderer — one standalone landing page per config, served on
 * its own domain via the proxy's host rewrite. SEO contract enforced here:
 * only `live` configs render (and index); anything else gets a minimal
 * noindex holding page so a freshly-attached domain NEVER mirrors liqwd.ca.
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
  const title =
    config.content.seo_title ||
    `${project?.project_name ?? config.content.headline}${project?.city ? ` — ${project.city}` : ""} | Pricing, Floor Plans & Launch Details`;
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

  const c = config.content;
  const price = formatPriceBand(project.price_from_public, project.price_to_public, {
    currency: project.price_currency,
  });
  const location = [project.neighbourhood, project.city, project.province]
    .filter(Boolean)
    .join(", ");

  const jsonLd = [
    c.faq.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: c.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-white">
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}

      {/* Hero */}
      <header className="relative overflow-hidden bg-ink text-white">
        {project.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.hero_image_url}
            alt={project.hero_image_alt ?? project.project_name}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
          {project.sales_status === "coming_soon" ? (
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
              Coming soon{location ? ` · ${location}` : ""}
            </span>
          ) : null}
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {c.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
            {c.subhead}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            {price ? (
              <span className="rounded-full bg-white px-4 py-1.5 font-semibold text-ink">
                {price}
              </span>
            ) : null}
            {project.bedrooms_summary ? (
              <span className="rounded-full border border-white/30 px-4 py-1.5">
                {project.bedrooms_summary}
              </span>
            ) : null}
          </div>
          <a
            href="#register"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-brand-500 px-8 text-base font-semibold text-white transition-colors hover:bg-brand-400"
          >
            {c.cta_label}
          </a>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.intro_md) }} />

        {c.sections.map((s) => (
          <section key={s.title} className="mt-10">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              {s.title}
            </h2>
            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }} />
          </section>
        ))}

        {c.faq.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {c.faq.map((f) => (
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
          className="mt-14 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Get first access
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pricing, floor plans, and launch timing — sent as they&apos;re
            released, before the general public.
          </p>
          <div className="mt-5">
            <MicrositeLeadForm
              domain={config.domain}
              captureKey={config.capture_key}
              ctaLabel={c.cta_label}
            />
          </div>
        </section>
      </div>

      {/* Disclosure — the passing-off + PBN guards, both. */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-8 text-xs leading-relaxed text-slate-500">
          <p>
            Independent information page operated by LIQWD — not the
            builder&apos;s official website. Details reflect publicly
            available information and change as the project progresses;
            confirm all details with the builder&apos;s sales team. Renderings
            are the builder&apos;s marketing material.{" "}
            <a
              href={`https://liqwd.ca/projects/${project.slug}`}
              className="underline hover:text-slate-700"
            >
              See the full listing on LIQWD
            </a>
            .
          </p>
        </div>
      </footer>
    </main>
  );
}
