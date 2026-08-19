import {
  MICROSITE_SUBPAGES,
  type MicrositeConfig,
  type MicrositeImage,
} from "@/lib/microsites";
import type { PublicProject } from "@/lib/types";
import { formatPriceBand } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import { MicrositeLeadForm } from "./lead-form";
import { MicrositeFooter } from "./subpage";

/**
 * The microsite landing page itself, shared verbatim between the public
 * domain route and the admin preview — what you preview IS what ships.
 * Format follows the proven VIP-registration landing style: the hero IS the
 * lead form (name + photo + form, nothing else above the fold), education
 * sections next, photography breaking up the text, register again at the
 * bottom. Branding (palette + typography) comes from the project's own
 * renderings via the generation-time brand extractor; defaults kick in when
 * no brand was extracted.
 */

const anchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "section";

export function MicrositeSiteView({
  config,
  project,
  gallery,
  previewNote,
}: {
  config: MicrositeConfig;
  project: PublicProject;
  gallery: MicrositeImage[];
  /** Set on the admin preview: renders a banner, disables nothing else. */
  previewNote?: string;
}) {
  const c = config.content!;
  const brand = c.brand ?? null;
  const primary = brand?.primary ?? "#0d9488";
  const fontFamily = brand
    ? `'${brand.heading_font}', ${brand.font_stack}`
    : undefined;
  const fontHref = brand
    ? `https://fonts.googleapis.com/css2?family=${brand.heading_font.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`
    : null;

  const altFor = (img: MicrositeImage, i: number) =>
    img.alt_text ?? `${project.project_name} new construction rendering ${i + 1}`;
  const stripOne = gallery.slice(0, 3);
  const bandImages = gallery.slice(3);

  const price = formatPriceBand(project.price_from_public, project.price_to_public, {
    currency: project.price_currency,
  });
  const location = [project.neighbourhood, project.city, project.province]
    .filter(Boolean)
    .join(", ");
  const typeLabel = project.project_type
    ? project.project_type.replace(/_/g, " ")
    : null;

  const subpages = MICROSITE_SUBPAGES.filter((p) => c.pages?.[p.key]);
  const navItems = [
    ...subpages.map((p) => ({ href: `/${p.slug}`, label: p.label })),
    ...c.sections.map((s) => ({ href: `#${anchor(s.title)}`, label: s.title })),
    ...(c.faq.length ? [{ href: "#faq", label: "FAQ" }] : []),
    { href: "#register", label: "Register" },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ApartmentComplex",
      name: project.project_name,
      url: `https://${config.domain}/`,
      ...(project.hero_image_url ? { image: project.hero_image_url } : {}),
      address: {
        "@type": "PostalAddress",
        ...(project.address_full ? { streetAddress: project.address_full } : {}),
        ...(project.city ? { addressLocality: project.city } : {}),
        ...(project.province ? { addressRegion: project.province } : {}),
        addressCountry: "CA",
      },
      ...(project.price_from_public
        ? {
            offers: {
              "@type": "AggregateOffer",
              lowPrice: Math.round(project.price_from_public),
              priceCurrency: project.price_currency ?? "CAD",
            },
          }
        : {}),
    },
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

  // Insert a full-width photo band after every second section.
  const bandAfter = (i: number): MicrositeImage | null =>
    (i + 1) % 2 === 0 ? (bandImages[Math.floor(i / 2)] ?? null) : null;

  return (
    <main className="min-h-screen bg-white" style={fontFamily ? { fontFamily } : undefined}>
      {fontHref ? (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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

      {previewNote ? (
        <div className="sticky top-0 z-30 bg-amber-500 px-6 py-2 text-center text-sm font-semibold text-white">
          {previewNote}
        </div>
      ) : null}

      {/* Hero — the lead form IS the hero (The Valley format). */}
      <header id="register-top" className="relative overflow-hidden bg-ink text-white">
        {project.hero_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.hero_image_url}
            alt={project.hero_image_alt ?? project.project_name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative mx-auto max-w-xl px-6 py-14 text-center sm:py-18">
          {project.sales_status === "coming_soon" ? (
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
              Coming soon{location ? ` · ${location}` : ""}
            </span>
          ) : null}
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {c.headline}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-lg text-white/90">{c.subhead}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            {price ? (
              <span className="rounded-full bg-white px-4 py-1.5 font-semibold text-ink">
                {price}
              </span>
            ) : null}
            {project.bedrooms_summary ? (
              <span className="rounded-full border border-white/40 px-4 py-1.5">
                {project.bedrooms_summary}
              </span>
            ) : null}
            {typeLabel ? (
              <span className="rounded-full border border-white/40 px-4 py-1.5 capitalize">
                {typeLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-7 rounded-2xl bg-white/95 p-6 text-left shadow-xl backdrop-blur sm:p-7">
            <p className="text-center text-lg font-semibold text-ink">
              {c.cta_label}
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              Pricing, floor plans, and launch details, sent as they come out.
            </p>
            <div className="mt-4">
              <MicrositeLeadForm
                idPrefix="hero"
                domain={config.domain}
                captureKey={config.capture_key}
                ctaLabel={c.cta_label}
                accentColor={primary}
              />
            </div>
          </div>
        </div>
      </header>

      {/* On this page */}
      <nav
        aria-label="On this page"
        className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-3xl gap-4 overflow-x-auto px-6 py-3 text-sm text-slate-500">
          {navItems.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="whitespace-nowrap hover:text-slate-900"
            >
              {n.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Body */}
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(c.intro_md) }} />

        {stripOne.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {stripOne.map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.url}
                src={img.url}
                alt={altFor(img, i)}
                loading="lazy"
                className="h-44 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        ) : null}

        {c.sections.map((s, i) => {
          const band = bandAfter(i);
          return (
            <div key={s.title}>
              <section id={anchor(s.title)} className="mt-10 scroll-mt-16">
                <h2 className="text-2xl font-semibold tracking-tight text-ink">
                  {s.title}
                </h2>
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }} />
              </section>
              {band ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={band.url}
                  alt={altFor(band, gallery.indexOf(band))}
                  loading="lazy"
                  className="mt-10 h-64 w-full rounded-2xl object-cover sm:h-80"
                />
              ) : null}
            </div>
          );
        })}

        {subpages.length ? (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Go deeper
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {subpages.map((p) => (
                <a
                  key={p.slug}
                  href={`/${p.slug}`}
                  className="rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                >
                  <p className="font-semibold text-ink">
                    {project.project_name} {p.label.toLowerCase()}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {c.pages?.[p.key]?.meta_description}
                  </p>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        {c.faq.length > 0 ? (
          <section id="faq" className="mt-12 scroll-mt-16">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Frequently asked questions
            </h2>
            <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
              {c.faq.map((f) => (
                <details key={f.question} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none font-medium text-slate-800">
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

        {/* Register — bottom */}
        <section
          id="register"
          className="mt-14 scroll-mt-16 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Get first access
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Pricing, floor plans, and launch timing, sent to you as they come
            out and before the general public.
          </p>
          <div className="mt-5">
            <MicrositeLeadForm
              idPrefix="bottom"
              domain={config.domain}
              captureKey={config.capture_key}
              ctaLabel={c.cta_label}
              accentColor={primary}
            />
          </div>
        </section>
      </div>

      <MicrositeFooter slug={project.slug} />
    </main>
  );
}
