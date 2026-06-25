import { type ReactNode, Fragment } from "react";
import {
  Gift,
  Ban,
  Building2,
  LayoutGrid,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { DashboardMock } from "@/components/marketing/dashboard-mock";
import { ProjectPageMock } from "@/components/marketing/project-page-mock";
import { ShowcaseFigure } from "@/components/marketing/showcase-figure";
import type { ShowcaseCaption } from "@/lib/brand";
import {
  HERO,
  HERO_VISUAL,
  PROOF_POINTS,
  HOW_IT_WORKS,
  EARN,
  FEATURE_CARDS,
  VERIFICATION,
  COMING_SOON,
  SIGNUP_SECTION,
  LOGO_STRIP,
  BROKERAGES,
  SECTION_IMAGES,
} from "@/lib/brand";

// One icon per feature card (order matches FEATURE_CARDS).
const FEATURE_ICONS: LucideIcon[] = [Gift, Ban, Building2, LayoutGrid, TrendingUp];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mt-1 size-4 shrink-0 text-brand-600"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Uppercase micro-label used to open each section. */
function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="flex items-baseline gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
      <span className="font-mono text-brand-600">{index}</span>
      {children}
    </p>
  );
}

/** Editorial section: one image paired with a heading + body, sides alternating. */
function FeatureSection({
  index,
  eyebrow,
  heading,
  image,
  imageLeft = false,
  muted = false,
  children,
}: {
  index: string;
  eyebrow: string;
  heading: string;
  image: { src: string; alt: string; caption?: ShowcaseCaption };
  imageLeft?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={muted ? "border-y border-slate-200 bg-slate-50/60" : "bg-white"}
    >
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionLabel index={index}>{eyebrow}</SectionLabel>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {heading}
            </h2>
            <div className="mt-8">{children}</div>
          </div>
          <div className={imageLeft ? "lg:order-first" : undefined}>
            {/* No frosted caption here: the realtor showcase images already
                carry their own baked-in overlay, so a code caption would double
                up. (The developer page intentionally captions its bare
                renderings — that's a separate component.) */}
            <ShowcaseFigure src={image.src} alt={image.alt} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate bg-white">
        <div
          aria-hidden
          className="hero-grid pointer-events-none absolute inset-0 -z-10"
        />
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pb-20 sm:pt-16">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                <span aria-hidden className="h-px w-8 bg-brand-500" />
                {HERO.supporting}
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {HERO.headline}
                <span className="block text-slate-400">{HERO.subheadline}</span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                {HERO.body}
              </p>
              <div className="mt-8">
                <ButtonLink href="/signup" size="lg" className="px-8">
                  {HERO.primaryCta}
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-slate-500">{HERO.microcopy}</p>
            </div>

            {/* Skyline shot with the coded dashboard mock pasted over it — the
                hero shows the product, framed by a real-estate backdrop. */}
            <div className="mx-auto w-full max-w-sm sm:max-w-md lg:ml-auto lg:max-w-[28rem] lg:pl-4">
              <div className="relative">
                <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- hero LCP image, CSS-sized */}
                  <img
                    src={HERO_VISUAL.src}
                    alt={HERO_VISUAL.alt}
                    fetchPriority="high"
                    className="block aspect-square w-full object-cover"
                  />
                </div>
                <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
                  <DashboardMock />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brokerage logo marquee */}
      <LogoMarquee logos={BROKERAGES} label={LOGO_STRIP.label} />

      {/* Proof strip */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-6">
          {PROOF_POINTS.map((point, i) => (
            <span
              key={point}
              className="flex items-center gap-8 text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
            >
              {i > 0 ? (
                <span
                  aria-hidden
                  className="hidden size-1 rounded-full bg-brand-500 sm:block"
                />
              ) : null}
              {point}
            </span>
          ))}
        </div>
      </section>

      {/* 01 — How free project leads work */}
      <section id="how-it-works" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <SectionLabel index="01">How it works</SectionLabel>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {HOW_IT_WORKS.heading}
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-slate-600">
              {HOW_IT_WORKS.subheading}
            </p>
          </div>

          {/* Lead-flow graphic — the product model, left to right. */}
          <div className="mt-12 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {HOW_IT_WORKS.flow.map((node, i) => (
              <Fragment key={node}>
                <div className="flex flex-1 items-center justify-center rounded-xl border border-brand-100 bg-brand-50/70 px-3 py-4 text-center text-sm font-semibold text-brand-800">
                  {node}
                </div>
                {i < HOW_IT_WORKS.flow.length - 1 ? (
                  <span
                    aria-hidden
                    className="flex items-center justify-center text-lg text-brand-300"
                  >
                    <span className="rotate-90 sm:rotate-0">→</span>
                  </span>
                ) : null}
              </Fragment>
            ))}
          </div>

          {/* The public page that generates inquiries, paired with the steps —
              lighter than the benefit cards below, on purpose. */}
          <div className="mt-14 grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="mx-auto w-full max-w-sm">
              <ProjectPageMock />
            </div>
            <ol className="space-y-8">
              {HOW_IT_WORKS.steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className="mt-12 max-w-3xl text-xs leading-relaxed text-slate-400">
            {HOW_IT_WORKS.disclaimer}
          </p>
        </div>
      </section>

      {/* 02 — More ways to earn + feature cards */}
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="max-w-2xl">
            <SectionLabel index="02">Why LIQWD</SectionLabel>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {EARN.heading}
            </h2>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-slate-600">
              {EARN.subheading}
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CARDS.map((card, i) => {
              const Icon = FEATURE_ICONS[i];
              // The free buyer-lead path is the headline offer — feature it.
              const featured = i === 0;
              return (
                <div
                  key={card.title}
                  className={`group rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    featured
                      ? "border-brand-200 bg-brand-50/70 sm:col-span-2"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center rounded-xl ring-1 ring-inset transition-colors ${
                      featured
                        ? "size-12 bg-brand-600 text-white ring-brand-600"
                        : "size-11 bg-brand-50 text-brand-600 ring-brand-100 group-hover:bg-brand-100"
                    }`}
                  >
                    <Icon
                      className={featured ? "size-6" : "size-5"}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </span>
                  <h3
                    className={`mt-5 font-semibold text-ink ${
                      featured ? "text-xl" : "text-base"
                    }`}
                  >
                    {card.title}
                  </h3>
                  <p
                    className={`mt-1.5 leading-relaxed ${
                      featured
                        ? "text-base text-slate-600"
                        : "text-sm text-slate-500"
                    }`}
                  >
                    {card.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 03 — Verified access (trust) */}
      <FeatureSection
        index="03"
        eyebrow="Verified access"
        heading={VERIFICATION.heading}
        image={SECTION_IMAGES.verified}
        imageLeft
      >
        <p className="text-pretty text-lg leading-relaxed text-slate-600">
          {VERIFICATION.body}
        </p>
        <ul className="mt-8 space-y-4">
          {VERIFICATION.bullets.map((b) => (
            <li key={b} className="flex gap-3">
              <CheckIcon />
              <span className="text-slate-700">{b}</span>
            </li>
          ))}
        </ul>
      </FeatureSection>

      {/* Coming soon — more earning paths (kept low on the page) */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-4 sm:pb-28">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-10 text-center sm:p-12">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-600">
              Coming soon
            </p>
            <h2 className="mx-auto mt-4 max-w-xl text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {COMING_SOON.heading}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-pretty leading-relaxed text-slate-600">
              {COMING_SOON.subheading}
            </p>
          </div>
        </div>
      </section>

      {/* Signup CTA */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div
          aria-hidden
          className="cta-glow pointer-events-none absolute inset-0 -z-10"
        />
        <div className="mx-auto max-w-6xl px-6 py-28 text-center sm:py-36">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">
            Free for verified realtors
          </p>
          <h2 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {SIGNUP_SECTION.heading}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-400">
            {SIGNUP_SECTION.body}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/signup" size="lg" variant="white" className="px-8">
              Sign up free
            </ButtonLink>
            <ButtonLink href="#how-it-works" size="lg" variant="outlineLight">
              See how it works
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
