"use client";

/**
 * LIQWD onboarding — a TurboTax-style guided walkthrough: one concept per
 * "slide", plain language, and ALWAYS lead with the money (the outcome) before
 * the steps. Self-contained (no third-party tour library) so it stays cheap and
 * lives where the action is.
 *
 * Content split, deliberately: only promise what's live today. Anything that
 * depends on a developer/operator partner (rental referral income) is content-
 * complete but badged "Coming soon" and dead-ends at a gate — never a broken
 * CTA. See docs/onboarding-content.md.
 */

import { useState } from "react";
import Link from "next/link";
import {
  HandCoins,
  FileText,
  Gift,
  Building2,
  Compass,
  ClipboardCheck,
  Handshake,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { SECTION_ACCENT, type SectionAccent } from "@/lib/section-accents";

type Slide = {
  eyebrow: string; // tiny label: "The payoff", "Step 1", …
  title: string; // money-led outcome, in plain words
  body: string;
  gate?: boolean; // final, non-actionable "Coming soon" panel
};

type EarnPath = {
  id: string;
  icon: LucideIcon;
  tile: string; // picker tile label
  tagline: string; // one-line picker subtitle
  status: "now" | "soon";
  accent: SectionAccent;
  slides: Slide[];
  cta?: { label: string; href: string }; // do-it-now (NOW paths only)
};

// Ordered: deliverable-today paths first, the partner-dependent one last and
// clearly badged.
const PATHS: EarnPath[] = [
  {
    id: "leads",
    icon: HandCoins,
    tile: "Get free leads",
    tagline: "Add or update a project, get its buyer leads.",
    status: "now",
    accent: "emerald",
    slides: [
      {
        eyebrow: "The payoff",
        title: "Get buyer leads — for free",
        body: "When a buyer asks about a project you added or updated, that lead comes straight to you. No fee, no catch.",
      },
      {
        eyebrow: "Step 1",
        title: "Add or update a project",
        body: "Submit a brand-new project, or send an update on any project already on LIQWD. Both count.",
      },
      {
        eyebrow: "Step 2",
        title: "You become the agent on its page",
        body: "Once it's live, buyer enquiries from that project's page route to you automatically.",
      },
    ],
    cta: { label: "Add your first project", href: "/dashboard/submit" },
  },
  {
    id: "pages",
    icon: FileText,
    tile: "Run more lead pages",
    tagline: "Pro unlocks up to 10 landing pages.",
    status: "now",
    accent: "emerald",
    slides: [
      {
        eyebrow: "The payoff",
        title: "Capture more leads with your own pages",
        body: "Pro unlocks up to 10 lead-generating landing pages for the projects you work — more pages, more leads.",
      },
      {
        eyebrow: "No pressure",
        title: "Your free plan stays free",
        body: "Nothing changes until you choose to upgrade. Go Pro only when you want the extra reach.",
      },
    ],
    cta: { label: "See what Pro includes", href: "/dashboard/upgrade" },
  },
  {
    id: "refer",
    icon: Gift,
    tile: "Refer an agent",
    tagline: "Invite an agent — you both get Pro.",
    status: "now",
    accent: "emerald",
    slides: [
      {
        eyebrow: "The payoff",
        title: "Invite an agent — you both get Pro free",
        body: "Share your link. When an agent joins through it, you each earn a free month of LIQWD Pro.",
      },
    ],
    cta: { label: "Get your invite link", href: "/dashboard/refer" },
  },
  {
    id: "buyer-matching",
    icon: ClipboardCheck,
    tile: "Match a tough buyer",
    tagline: "Post what they want, let inventory come to you.",
    status: "now",
    accent: "emerald",
    slides: [
      {
        eyebrow: "The payoff",
        title: "Let the right inventory find your buyer",
        body: "Got a buyer you can't place? Post what they're after and matching new-home inventory comes to you — instead of you hunting for it.",
      },
      {
        eyebrow: "How it works",
        title: "Describe the buyer once",
        body: "City, budget, and unit type. Matching projects surface to you, and developers with the right units can reach out.",
      },
    ],
    cta: { label: "Post a buyer", href: "/dashboard/buyer-mandates" },
  },
  {
    id: "negotiate",
    icon: FileText,
    tile: "Negotiate better terms",
    tagline: "Ask developers for the terms that close.",
    status: "now",
    accent: "emerald",
    slides: [
      {
        eyebrow: "The payoff",
        title: "Ask for the terms that close the deal",
        body: "Need a better commission, price, or incentive to get your buyer over the line? Request it from the developer — directly.",
      },
      {
        eyebrow: "How it works",
        title: "Send the ask, track the answer",
        body: "Request terms on any project and follow every response in one place — no chasing email threads.",
      },
    ],
    cta: { label: "Request terms", href: "/dashboard/proposals" },
  },
  {
    id: "rentals",
    icon: Building2,
    tile: "Earn from rentals",
    tagline: "Get paid to refer renters.",
    status: "soon",
    accent: "slate",
    slides: [
      {
        eyebrow: "The payoff",
        title: "Get paid to refer renters",
        body: "Refer a client to a purpose-built rental. The building's leasing team does the rest — you get paid when they sign.",
      },
      {
        eyebrow: "Low effort",
        title: "No showings, no paperwork",
        body: "Just route a qualified renter between your bigger deals. Fast payout for almost no work.",
      },
      {
        eyebrow: "Almost here",
        title: "Coming soon",
        body: "We're signing up rental partners now. We'll let you know the moment it's live.",
        gate: true,
      },
    ],
  },
  {
    id: "deal-desk",
    icon: Handshake,
    tile: "Developer Deals",
    tagline: "Bulk buys, listing mandates, full developments.",
    status: "soon",
    accent: "slate",
    slides: [
      {
        eyebrow: "The payoff",
        title: "First call on developer deals",
        body: "Bulk buys, listing mandates, and entire developments — matched to a short list of agents before they hit the open market.",
      },
      {
        eyebrow: "Why it's big",
        title: "Bigger tickets, fewer players",
        body: "These are the high-value mandates developers hand to a trusted few. Get on the list and the deals come to you.",
      },
      {
        eyebrow: "Almost here",
        title: "Coming soon",
        body: "We're lining up developer deal flow now. We'll let you know the moment it opens.",
        gate: true,
      },
    ],
  },
];

type View =
  | { kind: "welcome" }
  | { kind: "picker" }
  | { kind: "path"; pathId: string; slide: number };

export function OnboardingWizard() {
  const [view, setView] = useState<View>({ kind: "welcome" });

  const exit = (
    <Link
      href="/dashboard"
      className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
    >
      Skip for now
    </Link>
  );

  if (view.kind === "welcome") {
    return (
      <Shell exit={exit}>
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-8 text-center sm:p-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <HandCoins className="size-3" strokeWidth={2} aria-hidden /> Get
            started
          </span>
          <h1 className="mx-auto mt-4 max-w-xl text-balance text-3xl font-semibold tracking-tight text-ink">
            Get paid for the work you already do
          </h1>
          <p className="mx-auto mt-3 max-w-md text-pretty text-slate-600">
            A few simple ways to earn on LIQWD. Pick one and we&apos;ll show you
            how — about 2 minutes.
          </p>
          <div className="mt-6">
            <Button onClick={() => setView({ kind: "picker" })} size="lg">
              Show me how <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (view.kind === "picker") {
    return (
      <Shell exit={exit}>
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              How do you want to earn?
            </h1>
            <p className="mt-1 text-slate-500">
              Pick one to see exactly how it works. You can come back for the
              others.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {PATHS.map((p) => (
              <PickerTile
                key={p.id}
                path={p}
                onSelect={() =>
                  setView({ kind: "path", pathId: p.id, slide: 0 })
                }
              />
            ))}
          </div>
          {/* Supporting value — a tool, not a hard $ promise. */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-100">
                <Compass
                  className="size-5 text-sky-600"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
              <div>
                <p className="font-semibold text-ink">Everything in one place</p>
                <p className="text-sm text-slate-500">
                  Browse active projects and every broker portal you can access —
                  spot the right opportunity faster.
                </p>
              </div>
            </div>
            <ButtonLink
              href="/dashboard/projects"
              variant="secondary"
              size="sm"
              className="mt-3 shrink-0 sm:mt-0"
            >
              Browse projects
            </ButtonLink>
          </div>
        </div>
      </Shell>
    );
  }

  // view.kind === "path"
  const path = PATHS.find((p) => p.id === view.pathId);
  if (!path) {
    // Defensive: unknown id → back to picker.
    setView({ kind: "picker" });
    return null;
  }
  const slide = path.slides[view.slide];
  const isLast = view.slide === path.slides.length - 1;
  const a = SECTION_ACCENT[path.accent];

  const goBack = () =>
    view.slide === 0
      ? setView({ kind: "picker" })
      : setView({ kind: "path", pathId: path.id, slide: view.slide - 1 });

  const goNext = () =>
    setView({ kind: "path", pathId: path.id, slide: view.slide + 1 });

  return (
    <Shell exit={exit}>
      <div className="space-y-5">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {path.slides.map((s, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === view.slide
                  ? cn("w-6", a.dotBg)
                  : i < view.slide
                    ? cn("w-1.5", a.dotBg)
                    : "w-1.5 bg-slate-200",
              )}
              aria-hidden
            />
          ))}
        </div>

        <div
          className={cn(
            "rounded-2xl p-7 ring-1 ring-inset sm:p-9",
            slide.gate ? "bg-slate-50 ring-slate-200" : a.zone,
          )}
        >
          {slide.gate ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              <Clock className="size-3" strokeWidth={2} aria-hidden /> Coming
              soon
            </span>
          ) : (
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-[0.14em]",
                a.header,
              )}
            >
              {slide.eyebrow}
            </span>
          )}
          <h2 className="mt-2 max-w-lg text-balance text-2xl font-semibold tracking-tight text-ink">
            {slide.title}
          </h2>
          <p className="mt-2 max-w-lg text-pretty leading-relaxed text-slate-600">
            {slide.body}
          </p>

          {/* Do-it-now CTA on the final slide of a live path. */}
          {isLast && path.cta ? (
            <div className="mt-6">
              <ButtonLink href={path.cta.href}>
                {path.cta.label} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          ) : null}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="size-4" aria-hidden />{" "}
            {view.slide === 0 ? "All ways to earn" : "Back"}
          </Button>
          {!isLast ? (
            <Button variant="secondary" size="sm" onClick={goNext}>
              Next <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => setView({ kind: "picker" })}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              See other ways to earn
            </button>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  children,
  exit,
}: {
  children: React.ReactNode;
  exit: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Welcome to LIQWD
        </span>
        {exit}
      </div>
      {children}
    </div>
  );
}

function PickerTile({
  path,
  onSelect,
}: {
  path: EarnPath;
  onSelect: () => void;
}) {
  const a = SECTION_ACCENT[path.accent];
  const Icon = path.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex h-full flex-col items-start gap-3 rounded-xl border bg-white p-5 text-left transition-shadow hover:shadow-md",
        path.status === "soon" ? "border-slate-200" : "border-slate-200",
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-lg",
            a.chip,
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        {path.status === "now" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <Sparkles className="size-3" aria-hidden /> Now
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Clock className="size-3" aria-hidden /> Coming soon
          </span>
        )}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-ink">{path.tile}</p>
        <p className="mt-0.5 text-sm text-slate-500">{path.tagline}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-700">
        {path.status === "now" ? "Show me how" : "Take a look"}
        <ArrowRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </button>
  );
}
