import {
  MICROSITE_SUBPAGES,
  SECTION_STOCK_THEME,
  pickStock,
  type MicrositeConfig,
  type MicrositeImage,
  type StockImage,
  type StockTheme,
} from "@/lib/microsites";
import type { PublicProject } from "@/lib/types";
import { formatPriceBand } from "@/lib/types";
import { renderMarkdown } from "@/lib/markdown";
import { MicrositeLeadForm } from "./lead-form";
import { MicrositeFooter } from "./subpage";

/**
 * The microsite landing page itself, shared verbatim between the public
 * domain route and the admin preview — what you preview IS what ships.
 *
 * Format (founder-specified, The Valley pattern):
 *  - hero: location chip + the project NAME + the register form, above the
 *    fold. `context.hero_style = "colour"` swaps the photo for a branded
 *    gradient (for projects whose hero image is a placeholder graphic);
 *  - body: sections alternate text/image columns (left-right-left), never a
 *    plain linear stack; real renderings first, themed stock images fill
 *    the gaps (transit for getting-around, parks/cafés for amenities, …);
 *  - map with the address pin near the bottom; navigation in the footer.
 * Branding (palette + typography) comes from the project's own renderings.
 */

const anchor = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "section";

const STOCK_ALT: Record<StockTheme, string> = {
  hero: "Scenic view",
  neighbourhood: "Neighbourhood streetscape",
  transit: "Local transit",
  amenities: "Local shops and cafés",
  parks: "Parks and trails",
  homes: "New construction homes",
  lifestyle: "Everyday life",
  generic: "Community scene",
};

interface PageImage {
  url: string;
  alt: string;
}

export function MicrositeSiteView({
  config,
  project,
  gallery,
  stock,
  previewNote,
}: {
  config: MicrositeConfig;
  project: PublicProject;
  gallery: MicrositeImage[];
  stock: StockImage[];
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

  // ---- Imagery: real renderings first, themed stock fills the gaps. -------
  const used = new Set<string>();
  const seed = config.domain;
  const city = project.city ?? null;
  const stockImage = (theme: StockTheme): PageImage | null => {
    const s = pickStock(stock, theme, city, seed, used);
    if (!s) return null;
    const base = s.alt_text ?? STOCK_ALT[s.theme];
    return { url: s.url, alt: s.city ? `${base} in ${s.city}` : base };
  };
  const realQueue: PageImage[] = gallery.map((g, i) => ({
    url: g.url,
    alt: g.alt_text ?? `${project.project_name} new construction rendering ${i + 1}`,
  }));

  const heroStyle =
    config.context?.hero_style === "colour" ? "colour" : "image";
  const heroImage: PageImage | null =
    heroStyle === "colour"
      ? null
      : project.hero_image_url
        ? {
            url: project.hero_image_url,
            alt: project.hero_image_alt ?? project.project_name,
          }
        : stockImage("hero");

  const introImage = realQueue.shift() ?? stockImage("homes");
  // Evergreen explainers render as drop-downs, not full sections — they're
  // reference material, not the pitch. They don't consume an image slot.
  const collapsible = (key?: string) => key === "buying_process";
  const sectionImages = c.sections.map((s) =>
    collapsible(s.key)
      ? null
      : (realQueue.shift() ??
        stockImage(SECTION_STOCK_THEME[s.key ?? ""] ?? "generic")),
  );
  const leftovers = realQueue.splice(0);

  const price = formatPriceBand(project.price_from_public, project.price_to_public, {
    currency: project.price_currency,
  });
  const chip = [project.city, project.province].filter(Boolean).join(", ");
  const mapQuery =
    project.address_full ??
    [project.project_name, project.city, project.province]
      .filter(Boolean)
      .join(", ");

  const subpages = MICROSITE_SUBPAGES.filter((p) => c.pages?.[p.key]);
  const footerLinks = [
    ...subpages.map((p) => ({ href: `/${p.slug}`, label: p.label })),
    ...c.sections
      .slice(0, 5)
      .map((s) => ({ href: `#${anchor(s.title)}`, label: s.title })),
    ...(c.faq.length ? [{ href: "#faq", label: "FAQ" }] : []),
    { href: "#map", label: "Location" },
    { href: "#register", label: "Register Now" },
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

      {/* Hero — chip, NAME, form. The form renders above the fold. */}
      <header
        id="register-top"
        className="relative overflow-hidden text-white"
        style={
          heroImage
            ? undefined
            : { background: `linear-gradient(160deg, ${primary} 0%, #101828 100%)` }
        }
      >
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage.url}
            alt={heroImage.alt}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        ) : null}
        {heroImage ? <div className="absolute inset-0 bg-black/60" /> : null}
        <div className="relative mx-auto max-w-md px-6 py-10 text-center sm:py-12">
          {chip ? (
            <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
              {chip}
            </span>
          ) : null}
          <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            {project.project_name}
          </h1>
          <div className="mt-6 rounded-2xl bg-white p-6 text-left shadow-2xl sm:p-7">
            <p
              className="text-center text-xl font-semibold"
              style={{ color: primary }}
            >
              Register Now
            </p>
            <p className="mt-1 text-center text-sm text-slate-500">
              Get available floor plans, pricing and details.
            </p>
            <div className="mt-4">
              <MicrositeLeadForm
                idPrefix="hero"
                compact
                domain={config.domain}
                captureKey={config.capture_key}
                ctaLabel="Register Now"
                accentColor={primary}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          {price ? (
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
              {price}
              {project.bedrooms_summary ? ` · ${project.bedrooms_summary}` : ""}
            </p>
          ) : null}
          <p className="mt-3 text-2xl font-medium leading-snug tracking-tight text-ink">
            {c.subhead}
          </p>
          <div
            className="mt-2"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(c.intro_md) }}
          />
        </div>

        {introImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={introImage.url}
            alt={introImage.alt}
            loading="lazy"
            className="mt-10 h-72 w-full rounded-2xl object-cover sm:h-96"
          />
        ) : null}

        {/* Sections alternate text/image sides — never a linear stack. */}
        {c.sections.map((s, i) => {
          const img = sectionImages[i];
          const imageLeft = i % 2 === 1;
          if (collapsible(s.key)) {
            return (
              <section
                key={s.title}
                id={anchor(s.title)}
                className="mx-auto mt-14 max-w-3xl scroll-mt-10"
              >
                <details className="group rounded-2xl border border-slate-200 px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold tracking-tight text-ink">
                      {s.title}
                    </h2>
                    <span
                      aria-hidden
                      className="text-slate-400 transition-transform group-open:rotate-180"
                    >
                      ▾
                    </span>
                  </summary>
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }}
                  />
                </details>
              </section>
            );
          }
          return (
            <section
              key={s.title}
              id={anchor(s.title)}
              className="mt-14 scroll-mt-10"
            >
              {img ? (
                <div className="grid items-center gap-8 sm:grid-cols-2">
                  <div className={imageLeft ? "sm:order-2" : undefined}>
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">
                      {s.title}
                    </h2>
                    <div
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }}
                    />
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt}
                    loading="lazy"
                    className={`h-64 w-full rounded-2xl object-cover sm:h-full sm:min-h-80 ${imageLeft ? "sm:order-1" : ""}`}
                  />
                </div>
              ) : (
                <div className="mx-auto max-w-3xl">
                  <h2 className="text-2xl font-semibold tracking-tight text-ink">
                    {s.title}
                  </h2>
                  <div
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(s.body_md) }}
                  />
                </div>
              )}
            </section>
          );
        })}

        {leftovers.length ? (
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {leftovers.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.url}
                src={img.url}
                alt={img.alt}
                loading="lazy"
                className="h-64 w-full rounded-2xl object-cover"
              />
            ))}
          </div>
        ) : null}

        {subpages.length ? (
          <section className="mt-14">
            <h2 className="text-2xl font-semibold tracking-tight text-ink">
              Go deeper
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <section id="faq" className="mx-auto mt-14 max-w-3xl scroll-mt-10">
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
          className="mx-auto mt-14 max-w-3xl scroll-mt-10 rounded-2xl border border-slate-200 bg-slate-50/60 p-6 sm:p-8"
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
              idPrefix="bottom"
              domain={config.domain}
              captureKey={config.capture_key}
              ctaLabel="Register Now"
              accentColor={primary}
            />
          </div>
        </section>

        {/* Location map */}
        <section id="map" className="mt-14 scroll-mt-10">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Location
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {project.address_full ?? chip}
          </p>
          <iframe
            title={`Map of ${project.project_name}`}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="mt-4 h-80 w-full rounded-2xl border-0"
          />
        </section>
      </div>

      <MicrositeFooter slug={project.slug} links={footerLinks} />
    </main>
  );
}
