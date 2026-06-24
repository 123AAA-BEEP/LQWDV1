import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Users, EyeOff, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { ShowcaseFigure } from "@/components/marketing/showcase-figure";
import type { ShowcaseCaption } from "@/lib/brand";
import {
  DEV_HERO,
  DEV_HERO_VISUAL,
  DEV_PROOF_POINTS,
  DEV_BENEFITS,
  DEV_DISCRETION,
  DEV_DEMAND,
  DEV_PROMOTE,
  DEV_SIGNUP_SECTION,
  DEV_SECTION_IMAGES,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: "For developers",
  description:
    "Sell your pre-construction project faster — reach Ontario's verified agents and motivated buyers on LIQWD.",
};

// Distinct icon per discretion point (order matches DEV_DISCRETION.points).
const DISCRETION_ICONS: LucideIcon[] = [ShieldCheck, SlidersHorizontal, EyeOff, Users];

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

function SectionLabel({ index, children }: { index: string; children: string }) {
  return (
    <p className="flex items-baseline gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
      <span className="font-mono text-brand-600">{index}</span>
      {children}
    </p>
  );
}

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
    <section className={muted ? "border-y border-slate-200 bg-slate-50/60" : "bg-white"}>
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
            <ShowcaseFigure
              src={image.src}
              alt={image.alt}
              caption={image.caption}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DevelopersLandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative isolate bg-white">
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pb-20 sm:pt-16">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                <span aria-hidden className="h-px w-8 bg-brand-500" />
                {DEV_HERO.supporting}
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {DEV_HERO.headline}
                <span className="block text-slate-400">{DEV_HERO.subheadline}</span>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                {DEV_HERO.body}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <ButtonLink href="/signup?role=developer" size="lg" className="px-8">
                  {DEV_HERO.primaryCta}
                </ButtonLink>
                <Link
                  href="/login?role=developer"
                  className="group inline-flex items-center gap-2 text-base font-medium text-ink"
                >
                  {DEV_HERO.secondaryCta}
                  <span aria-hidden className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm sm:max-w-md lg:ml-auto lg:max-w-[28rem] lg:pl-4">
              <HeroVisual data={DEV_HERO_VISUAL} />
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-6">
          {DEV_PROOF_POINTS.map((point, i) => (
            <span
              key={point}
              className="flex items-center gap-8 text-xs font-medium uppercase tracking-[0.18em] text-slate-500"
            >
              {i > 0 ? (
                <span aria-hidden className="hidden size-1 rounded-full bg-brand-500 sm:block" />
              ) : null}
              {point}
            </span>
          ))}
        </div>
      </section>

      {/* 01 — Discreet by design (the wedge) */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
            <div>
              <SectionLabel index="01">Discreet by design</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
                {DEV_DISCRETION.heading}
              </h2>
              <p className="mt-6 max-w-md text-pretty text-lg leading-relaxed text-slate-600">
                {DEV_DISCRETION.body}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {DEV_DISCRETION.points.map((pt, i) => {
                const Icon = DISCRETION_ICONS[i];
                return (
                  <div
                    key={pt.title}
                    className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 transition-colors group-hover:bg-brand-100">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <h3 className="mt-5 text-base font-semibold text-ink">{pt.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{pt.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 02 — What you get */}
      <FeatureSection
        index="02"
        eyebrow="What you get"
        heading="One workspace to move your inventory"
        image={DEV_SECTION_IMAGES.inventory}
        muted
      >
        <ol className="divide-y divide-slate-200">
          {DEV_BENEFITS.map((benefit, i) => (
            <li key={benefit} className="group flex gap-5 py-5 transition-colors first:pt-0 last:pb-0">
              <span className="pt-0.5 font-mono text-sm tabular-nums text-brand-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-pretty leading-relaxed text-slate-700 transition-colors group-hover:text-ink">
                {benefit}
              </p>
            </li>
          ))}
        </ol>
      </FeatureSection>

      {/* 03 — Demand-driven */}
      <FeatureSection
        index="03"
        eyebrow="Demand-driven"
        heading={DEV_DEMAND.heading}
        image={DEV_SECTION_IMAGES.demand}
        imageLeft
      >
        <p className="text-pretty text-lg leading-relaxed text-slate-600">{DEV_DEMAND.body}</p>
        <ul className="mt-8 space-y-4">
          {DEV_DEMAND.bullets.map((b) => (
            <li key={b} className="flex gap-3">
              <CheckIcon />
              <span className="text-slate-700">{b}</span>
            </li>
          ))}
        </ul>
      </FeatureSection>

      {/* 04 — Promote */}
      <FeatureSection
        index="04"
        eyebrow="Promote your project"
        heading={DEV_PROMOTE.heading}
        image={DEV_SECTION_IMAGES.promote}
        muted
      >
        <p className="text-pretty text-lg leading-relaxed text-slate-600">{DEV_PROMOTE.body}</p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {DEV_PROMOTE.bullets.map((b) => (
            <li
              key={b}
              className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {b.replace(/\.$/, "")}
            </li>
          ))}
        </ul>
      </FeatureSection>

      {/* Signup CTA */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="cta-glow pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 py-28 text-center sm:py-36">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">
            For builders &amp; developers
          </p>
          <h2 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {DEV_SIGNUP_SECTION.heading}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-400">
            {DEV_SIGNUP_SECTION.body}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/signup?role=developer" size="lg" variant="white" className="px-8">
              List your project
            </ButtonLink>
            <ButtonLink href="/" size="lg" variant="outlineLight">
              I&apos;m an agent →
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
