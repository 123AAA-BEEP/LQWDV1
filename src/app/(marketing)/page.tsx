import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { HeroShowcase } from "@/components/marketing/hero-showcase";
import { HeroVisual } from "@/components/marketing/hero-visual";
import {
  HERO,
  PROOF_POINTS,
  BENEFITS,
  VERIFICATION,
  WHY,
  SIGNUP_SECTION,
  LOGO_STRIP,
  BROKERAGES,
} from "@/lib/brand";

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

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate bg-white">
        <div
          aria-hidden
          className="hero-grid pointer-events-none absolute inset-0 -z-10"
        />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 sm:pb-28 sm:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                <span aria-hidden className="h-px w-8 bg-brand-500" />
                {HERO.supporting}
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {HERO.headline}
                <span className="block text-slate-400">{HERO.subheadline}</span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                {HERO.body}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-6">
                <ButtonLink href="/signup" size="lg" className="px-8">
                  {HERO.primaryCta}
                </ButtonLink>
                <Link
                  href="/signup"
                  className="group inline-flex items-center gap-2 text-base font-medium text-ink"
                >
                  {HERO.secondaryCta}
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </div>
            </div>

            <div className="lg:pl-4">
              <HeroVisual />
            </div>
          </div>
        </div>
      </section>

      {/* Showcase band — supplied marketing visuals */}
      <HeroShowcase />

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

      {/* Benefits — editorial numbered list */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionLabel index="01">What you get</SectionLabel>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              One portal for new-home inventory
            </h2>
          </div>
          <ol className="divide-y divide-slate-200 lg:col-span-8">
            {BENEFITS.map((benefit, i) => (
              <li
                key={benefit}
                className="group flex gap-6 py-7 transition-colors first:pt-0 last:pb-0"
              >
                <span className="pt-0.5 font-mono text-sm tabular-nums text-brand-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-pretty text-lg leading-relaxed text-slate-700 transition-colors group-hover:text-ink">
                  {benefit}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Verification */}
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionLabel index="02">Verified access</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {VERIFICATION.heading}
              </h2>
            </div>
            <div className="lg:col-span-8">
              <p className="max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
                {VERIFICATION.body}
              </p>
              <ul className="mt-10 space-y-5">
                {VERIFICATION.bullets.map((b) => (
                  <li key={b} className="flex gap-3">
                    <CheckIcon />
                    <span className="text-slate-700">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionLabel index="03">Why LIQWD</SectionLabel>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {WHY.heading}
            </h2>
          </div>
          <div className="lg:col-span-8">
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-slate-600">
              {WHY.body}
            </p>
            <ul className="mt-10 flex flex-wrap gap-3">
              {WHY.bullets.map((b) => (
                <li
                  key={b}
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  {b.replace(/\.$/, "")}
                </li>
              ))}
            </ul>
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
            <ButtonLink href="/signup" size="lg" variant="outlineLight">
              Start verification
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
