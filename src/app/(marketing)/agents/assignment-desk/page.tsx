import type { Metadata } from "next";
import {
  EyeOff,
  ShieldCheck,
  HandCoins,
  Scale,
  ArrowDown,
} from "lucide-react";
import { AssignmentIntakeForm } from "./intake-form";

export const metadata: Metadata = {
  title: "List Your Pre-Con Assignment Free — Founding Agents | LIQWD",
  description:
    "We're seeding the Assignment Desk: a licence-gated board where verified Ontario agents list pre-construction assignments. Founding agents list free and keep every inquiry — no fees, no commission split.",
  alternates: { canonical: "/agents/assignment-desk" },
};

/**
 * Cold-outreach landing for Assignment Desk supply seeding. The pitch is the
 * give: free listing, every inquiry routed to the agent, inside a gated
 * board (never public — the spec's load-bearing invariant, and the reason
 * this is safe to say out loud to agents who guard their inventory).
 */
export default function AssignmentDeskLanding({
  searchParams,
}: {
  searchParams?: Promise<{ src?: string }>;
}) {
  return <Content searchParamsPromise={searchParams} />;
}

async function Content({
  searchParamsPromise,
}: {
  searchParamsPromise?: Promise<{ src?: string }>;
}) {
  const sp = searchParamsPromise ? await searchParamsPromise : undefined;
  const source = typeof sp?.src === "string" ? sp.src.slice(0, 120) : undefined;

  return (
    <div className="mx-auto max-w-5xl px-6 py-14 sm:py-20">
      {/* Hero */}
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
          Founding agents · Assignment Desk
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Marketing an assignment? Put it in front of every verified pre-con
          agent — free.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          We&apos;re seeding a new section of LIQWD: a{" "}
          <span className="font-medium text-ink">licence-gated board</span> for
          pre-construction assignments in Ontario. Founding agents list free,
          and every inquiry goes{" "}
          <span className="font-medium text-ink">directly to you</span> — no
          referral fee, no commission split, no cut of the assignment. Ever.
        </p>
        <a
          href="#list"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Reserve your founding listing
          <ArrowDown className="size-4" aria-hidden />
        </a>
      </div>

      {/* How it works */}
      <section className="mt-16">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          How it works
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Tell us about your assignment",
              body: "Two minutes, no account needed — the form below. Project, city, asking price if you want.",
            },
            {
              title: "Verify your licence",
              body: "Create your free account and verify — instant for most RECO agents. BC and Florida supported too.",
            },
            {
              title: "Your listing goes live to verified agents",
              body: "On the gated board only. Agents with buyers reach out to you directly — you keep every inquiry.",
            },
          ].map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <h3 className="mt-3 font-semibold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Why agents trust it */}
      <section className="mt-14">
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Built for how assignments actually trade
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            {
              icon: EyeOff,
              title: "Gated — never public",
              body: "Assignments never appear on the consumer site, in Google, or to builders browsing. Verified agents only, like the old broker boards.",
            },
            {
              icon: ShieldCheck,
              title: "Licence-verified network",
              body: "Every member passed a real RECO verification. You're marketing to professionals, not tire-kickers scraping listings.",
            },
            {
              icon: HandCoins,
              title: "You keep 100%",
              body: "No referral fees, no commission split, no percentage of the assignment. Free for founding agents.",
            },
            {
              icon: Scale,
              title: "Your deal, your brokerage",
              body: "LIQWD is a discovery board, never a party to the trade. The assignment executes through your brokerages; you attest builder-consent status on the listing.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                <f.icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold text-ink">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The form */}
      <section id="list" className="mt-14 scroll-mt-24">
        <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Reserve your founding listing
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Tell us the basics — we&apos;ll reply the same day. Nothing
            publishes until you&apos;ve verified your licence and approved the
            listing yourself.
          </p>
          <div className="mt-6">
            <AssignmentIntakeForm source={source} />
          </div>
        </div>
      </section>

      {/* Compliance footnote */}
      <p className="mt-10 max-w-3xl text-xs leading-relaxed text-slate-400">
        LIQWD is a matchmaking platform for licensed professionals, not a
        brokerage, and is never a party to any assignment. Assignment
        agreements — including builder consent — execute off-platform through
        the agents&apos; brokerages. Listing content is the posting
        agent&apos;s responsibility under TRESA advertising rules.
      </p>
    </div>
  );
}
