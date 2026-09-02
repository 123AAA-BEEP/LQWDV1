import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Check, Globe, Inbox, Link2, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardMock } from "@/components/marketing/dashboard-mock";
import { ProjectPageMock } from "@/components/marketing/project-page-mock";
import { HERO_VISUAL, PROJECT_PAGE_VISUAL } from "@/lib/brand";
import { PRICING } from "@/lib/compare-data";
import { StartStickyCta } from "./start-cta";

/**
 * The ad landing page (campaign plan 2026-09, §5) — a NEW page beside the
 * existing /agents, not a replacement. SaaS formula: one promise, one
 * button repeated, product shown immediately, three steps, proof from live
 * numbers only, pricing with Free live and paid tiers honestly "coming",
 * five straight answers, one final CTA. Everything on it is true today.
 * `?v=` swaps the hero for message-match per ad group; the rest is shared.
 */

export const metadata: Metadata = {
  title: "Get Leads From Every Link You Share — Free for Ontario Agents",
  description:
    "A page in your name on LIQWD, 1,500+ new-home projects to send clients to, and every inquiry from your links routed to you. Verified in minutes with your RECO certificate. No brokerage change, no referral fees.",
  alternates: { canonical: "/start" },
};

const SIGNUP = "/signup?next=%2Fdashboard%2Fverify";
const CTA = "Create your free account";

type Variant = { eyebrow: string; headline: string; sub: string };
const VARIANTS: Record<string, Variant> = {
  default: {
    eyebrow: "Free for verified Ontario agents",
    headline: "Get leads from every link you share.",
    sub: "A page in your name, 1,500+ new-home projects to send clients to, and every inquiry from your links routed to you. Verified in minutes.",
  },
  supply: {
    eyebrow: "Pre-construction, without the gatekeeping",
    headline: "First access to 1,500+ new-home projects. Free.",
    sub: "Broker pricing, incentives and floor plans in one place, a page in your name, and every buyer who inquires through your link is yours.",
  },
  brand: {
    eyebrow: "LIQWD for agents",
    headline: "Your page. Your links. Your leads.",
    sub: "Free for verified Ontario agents: a page in your name, a link that makes every inquiry yours, and marketing that waits for your OK.",
  },
};

/** Live proof numbers, cached an hour. Only counts — never invented. */
const getCounts = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [projects, cities, leads] = await Promise.all([
      admin.from("public_projects_view").select("project_id", { count: "exact", head: true }),
      admin.from("public_projects_view").select("city").not("city", "is", null),
      admin
        .from("project_leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
    ]);
    const cityCount = new Set(
      ((cities.data ?? []) as { city: string | null }[]).map((r) => r.city).filter(Boolean),
    ).size;
    return {
      projects: projects.count ?? 0,
      cities: cityCount,
      leads30: leads.count ?? 0,
    };
  },
  ["start-counts"],
  { revalidate: 3600 },
);

const STEPS = [
  {
    n: 1,
    title: "Create your account",
    body: "Name, email, password. That's the form.",
  },
  {
    n: 2,
    title: "Verify in minutes",
    body: "Upload your RECO certificate. On a match you're approved on the spot — no waiting on a review. We read it and delete it.",
  },
  {
    n: 3,
    title: "Share your links",
    body: "Your page goes live in your name. Send any project page with your link and every inquiry from it is yours for 30 days.",
  },
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes. Your page, your links, the project catalogue, and every lead they bring are free for verified agents. LIQWD grows when you share LIQWD pages, so we have no reason to charge for that.",
  },
  {
    q: "Do I have to switch brokerages?",
    a: "No. You use LIQWD from the brokerage you're at. Your name, title, and brokerage appear on everything, the way RECO expects.",
  },
  {
    q: "How does verification work?",
    a: "You upload your RECO registration certificate. We read the name, number, status, and expiry, match it to your account, and approve you on the spot. The file isn't kept. If it doesn't match, a person reviews it, usually the same day.",
  },
  {
    q: "Who gets the leads from my links?",
    a: "You do. Anyone who opens a LIQWD page through your link is yours for 30 days, on every page they visit, even if they inquire on a different project later.",
  },
  {
    q: "What about my own website?",
    a: `That's the paid tier, coming soon: your colours, your design, your own domain included in the plan and registered in your name. Until then, your free page is the fastest way to be findable.`,
  },
];

const DIFFERENT = [
  "No referral fees on the leads your links bring in.",
  "No brokerage change. Your identification on every page.",
  "Verified in minutes, not days, with your RECO certificate.",
  "Every draft we ever make for you waits for your OK.",
];

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const hero = VARIANTS[v ?? "default"] ?? VARIANTS.default;
  const counts = await getCounts();
  const projectsLabel = `${Math.floor(counts.projects / 100) * 100 || counts.projects}+`;

  return (
    <div className="pb-20 lg:pb-0">
      {/* ---- Hero ------------------------------------------------------------ */}
      <section className="relative isolate bg-white">
        <div aria-hidden className="hero-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 pb-14 pt-10 sm:pb-20 sm:pt-16">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                <span aria-hidden className="h-px w-8 bg-brand-500" />
                {hero.eyebrow}
              </p>
              <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
                {hero.headline}
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">
                {hero.sub}
              </p>
              <div className="mt-8">
                <ButtonLink href={SIGNUP} size="lg" className="px-8">
                  {CTA}
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                No referral fees. No brokerage change. RECO verification required.
              </p>
            </div>
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

      {/* ---- Proof strip — live numbers only ---------------------------------- */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-6 sm:grid-cols-4">
          {[
            { v: projectsLabel, l: "new-home projects" },
            { v: String(counts.cities), l: "Ontario cities" },
            { v: counts.leads30 > 0 ? String(counts.leads30) : "—", l: "buyer inquiries, last 30 days" },
            { v: "Minutes", l: "to get verified" },
          ].map((s) => (
            <div key={s.l}>
              <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{s.v}</p>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- How it works ------------------------------------------------------ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">How it works</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Three steps. No sales call.
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <ButtonLink href={SIGNUP} size="lg" className="px-8">
              {CTA}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ---- What you get — the real product -------------------------------- */}
      <section className="border-y border-slate-200 bg-slate-50/60">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">What you get</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                Built to make every link you send pay you back.
              </h2>
              <ul className="mt-8 space-y-6">
                {[
                  {
                    icon: Globe,
                    t: "A page in your name",
                    b: "liqwd.ca/@you: your photo, bio, brokerage, and a working contact form, with a verified badge. Live the moment you're approved.",
                  },
                  {
                    icon: Link2,
                    t: "Every link is yours",
                    b: "Share any project page with your link. Your name, photo and number follow the buyer on every page for 30 days, and every inquiry routes to you.",
                  },
                  {
                    icon: Inbox,
                    t: "One inbox, one call",
                    b: "Leads land in your inbox with the page they came from. Home tells you who to call first and keeps score of how fast you reply.",
                  },
                  {
                    icon: ShieldCheck,
                    t: "A verified network",
                    b: "Broker pricing, incentives and off-market boards stay inside a RECO-verified network, never on the open web.",
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.t} className="flex gap-4">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                        <Icon className="size-5 text-brand-700" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div>
                        <p className="font-semibold text-ink">{f.t}</p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{f.b}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md">
              <div className="relative">
                <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- CSS-sized showcase image */}
                  <img
                    src={PROJECT_PAGE_VISUAL.src}
                    alt={PROJECT_PAGE_VISUAL.alt}
                    className="block h-[28rem] w-full object-cover sm:aspect-square sm:h-auto"
                  />
                </div>
                <div className="absolute left-4 top-4 w-[15rem] sm:left-6 sm:top-6 sm:w-[16.5rem]">
                  <ProjectPageMock />
                </div>
                {/* The follow strip, as the buyer sees it. */}
                <div className="absolute inset-x-4 bottom-4 flex items-center gap-2 rounded-xl border border-brand-100 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-800">
                    JS
                  </span>
                  <span className="min-w-0 truncate">
                    <span className="text-slate-500">You&apos;re browsing with </span>
                    <span className="font-semibold text-ink">Jane Smith</span>
                    <span className="hidden text-slate-500 sm:inline"> · Sales Representative</span>
                  </span>
                  <span className="ml-auto rounded-md border border-brand-200 px-2 py-0.5 font-medium text-brand-800">
                    Call
                  </span>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                A project page with your name on it, as the buyer sees it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Pricing ----------------------------------------------------------- */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Pricing</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Free stays free. Pay only when you want your own brand.
            </h2>
            <p className="mt-4 text-slate-600">
              No setup fee on any plan. Month to month. Your domain, when you have
              one with us, is registered in your name.
            </p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border-2 border-brand-500 bg-white p-6 shadow-md">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-ink">Free</p>
                <p className="text-2xl font-semibold text-ink">{PRICING.free}</p>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {[
                  "Your page on liqwd.ca, verified badge",
                  "Every inquiry from your links routed to you",
                  "3 project lead pages · 2 client hubs",
                  "1,500+ new-home projects, broker pricing",
                  "Marketplace, off-market and assignment boards",
                ].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
                    {x}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <ButtonLink href={SIGNUP} className="w-full">
                  {CTA}
                </ButtonLink>
              </div>
            </div>
            {[
              {
                name: "Pro",
                price: `${PRICING.pro}/mo`,
                items: [
                  "Your branded website: your colours, your design",
                  "Your own domain, included and yours",
                  "Blog written for you, resale search, custom email",
                  "10 lead pages · instant reply to every lead",
                ],
              },
              {
                name: "Premium",
                price: `${PRICING.premium}/mo`,
                items: [
                  "Everything, done for you",
                  "Google profile managed weekly, social, presentations",
                  "25 lead pages · all lead lanes",
                  "Text nurture until the lead is ready for you",
                ],
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                <div className="flex items-baseline justify-between">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {t.name}
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      Coming soon
                    </span>
                  </p>
                  <p className="text-2xl font-semibold text-ink">{t.price}</p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {t.items.map((x) => (
                    <li key={x} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-slate-400" strokeWidth={2.5} aria-hidden />
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 text-xs text-slate-500">
                  Join free now. Upgrade from your account the day it lands.
                </p>
              </div>
            ))}
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {DIFFERENT.map((d) => (
              <li key={d} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- FAQ ---------------------------------------------------------------- */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-28">
          <h2 className="text-3xl font-semibold tracking-tight text-ink">Straight answers</h2>
          <dl className="mt-6 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {FAQ.map((f) => (
              <div key={f.q} className="p-5">
                <dt className="font-medium text-ink">{f.q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---- Final CTA ------------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="cta-glow pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-400">
            Free for verified Ontario agents
          </p>
          <h2 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Your page can be live before your coffee&apos;s cold.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-slate-400">
            Three fields, one certificate upload, and every link you share starts
            working for you.
          </p>
          <div className="mt-10">
            <ButtonLink href={SIGNUP} size="lg" variant="white" className="px-8">
              {CTA}
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="underline hover:text-slate-300">
              Log in
            </Link>
          </p>
        </div>
      </section>

      <StartStickyCta href={SIGNUP} label={CTA} />
    </div>
  );
}
