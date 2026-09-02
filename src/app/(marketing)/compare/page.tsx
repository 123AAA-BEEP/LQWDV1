import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CHECKED_ON, COMPETITORS, PRICING, type Competitor } from "@/lib/compare-data";

export const metadata: Metadata = {
  title: "LIQWD vs. the Alternatives — Agent Websites & Marketing, Compared",
  description:
    "What Luxury Presence, Real Geeks, AgentLocator, Placester, myRealPage and other agent platforms charge, side by side with LIQWD: done-for-you marketing from $99 a month, no setup fee, cancel anytime, your domain in your name.",
  alternates: { canonical: "/compare" },
};

/**
 * The conquest landing page (campaign plan 2026-09, §5). Rules: competitor
 * names appear only in the table and the meta description, never in the
 * headline (rulebook ADS-1 proposed); every number is public-sourced and
 * dated (CLAIM-5); no superlatives. The honest line does the work.
 */

const LIQWD_TIERS = [
  {
    name: "Free",
    price: PRICING.free,
    what: "Your page on liqwd.ca, leads from your links routed to you, 3 lead pages, 2 client hubs.",
  },
  {
    name: "Pro",
    price: `${PRICING.pro}/mo`,
    what: "Branded website on your own domain (domain included), resale search, custom email, blog written for you, 10 lead pages, instant reply to every lead.",
  },
  {
    name: "Premium",
    price: `${PRICING.premium}/mo`,
    what: "Everything, done for you: Google profile managed weekly, social, listing presentations, all lead lanes, 25 lead pages, text nurture until handoff.",
  },
];

const DIFFERENT = [
  "No setup fee. Ever. The expensive platforms charge $1,500 to $7,500 before you've seen a page.",
  "Month to month. Cancel anytime. No 6- or 12-month agreement.",
  "Your domain is registered in your name and leaves with you.",
  "Done for you, not do-it-yourself. Every draft waits for one tap of your approval.",
  "Built for Ontario: RECO identification on every piece, CASL on every send, board rules on every listing. Automatically.",
];

const FAQ = [
  {
    q: "Is my domain really mine?",
    a: "Yes. We register it in your name, include the cost in your plan, and transfer it out if you ever leave.",
  },
  {
    q: "What happens if I cancel?",
    a: "Your paid site comes down at the end of the billing month. Your free LIQWD page, your leads, and your contacts stay in your account.",
  },
  {
    q: "Do you bundle ad spend into the price?",
    a: "No. Ad spend is your money, passed through with a management fee on top and a hard cap you set. Every dollar is itemized.",
  },
  {
    q: "Where do these competitor numbers come from?",
    a: `From each provider's public pricing page or an independent review, checked on ${CHECKED_ON}. Plans change. If we've got one wrong, tell us and we'll fix it the same day.`,
  },
];

export default function ComparePage() {
  const done = COMPETITORS.filter((c) => c.kind === "done");
  const diy = COMPETITORS.filter((c) => c.kind === "diy");

  return (
    <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
      {/* ---- Above the fold ------------------------------------------------ */}
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
          Compare
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Done-for-you marketing at a do-it-yourself price.
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          No setup fee. Cancel anytime. Your domain is yours. Below is what the
          other platforms charge, from their own pricing pages, next to what LIQWD
          includes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/signup">Start free</ButtonLink>
          <ButtonLink href="/audit" variant="secondary">
            Run the free audit
          </ButtonLink>
        </div>
      </div>

      {/* ---- LIQWD ---------------------------------------------------------- */}
      <section aria-labelledby="liqwd" className="mt-14">
        <h2 id="liqwd" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          LIQWD · prices in {PRICING.currency}
        </h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {LIQWD_TIERS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5"
            >
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-ink">{t.name}</p>
                <p className="text-lg font-semibold tabular-nums text-ink">{t.price}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.what}</p>
              <p className="mt-3 text-xs text-slate-500">No setup fee · month to month</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---- The table ----------------------------------------------------- */}
      <CompTable
        id="done"
        title="Done-for-you platforms"
        blurb="Humans run these, which is why they come with setup fees, contracts, and 'budget more for ads'."
        rows={done}
      />
      <CompTable
        id="diy"
        title="Do-it-yourself builders"
        blurb="Fair prices for a template you fill in yourself. The marketing is still your job."
        rows={diy}
      />

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        Competitor prices as published on their pricing pages or in independent
        reviews on {CHECKED_ON}, in the currency shown; plans change, verify with
        the provider. Names are trademarks of their respective owners. LIQWD is not
        affiliated with or endorsed by any of them. Something wrong?{" "}
        <a href="mailto:hello@liqwd.ca" className="underline hover:text-slate-600">
          hello@liqwd.ca
        </a>
        .
      </p>

      {/* ---- What's different ----------------------------------------------- */}
      <section aria-labelledby="different" className="mt-14">
        <h2 id="different" className="text-2xl font-semibold tracking-tight text-ink">
          What&apos;s different
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {DIFFERENT.map((d) => (
            <li key={d} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- FAQ ------------------------------------------------------------ */}
      <section aria-labelledby="faq" className="mt-14 max-w-3xl">
        <h2 id="faq" className="text-2xl font-semibold tracking-tight text-ink">
          Straight answers
        </h2>
        <dl className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {FAQ.map((f) => (
            <div key={f.q} className="p-5">
              <dt className="font-medium text-ink">{f.q}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
        <div>
          <p className="text-lg font-semibold text-ink">Start free. Upgrade when you want your own brand.</p>
          <p className="mt-1 text-sm text-slate-600">
            Leads from your links go to you from day one, on any plan.
          </p>
        </div>
        <div className="flex gap-3">
          <ButtonLink href="/signup">Start free</ButtonLink>
          <Link href="/agents" className="self-center text-sm font-medium text-brand-700 hover:underline">
            How it works →
          </Link>
        </div>
      </div>
    </div>
  );
}

function CompTable({
  id,
  title,
  blurb,
  rows,
}: {
  id: string;
  title: string;
  blurb: string;
  rows: Competitor[];
}) {
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{blurb}</p>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">What you get</th>
              <th className="px-4 py-3">Monthly</th>
              <th className="px-4 py-3">Setup</th>
              <th className="px-4 py-3">Contract</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((c) => (
              <tr key={c.name} className="align-top">
                <td className="px-4 py-3 font-medium text-ink">
                  {c.name}
                  {c.canada ? (
                    <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Canada
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.what}</td>
                <td className="px-4 py-3 text-slate-700">
                  {c.monthly} <span className="text-xs text-slate-400">{c.currency}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{c.setup}</td>
                <td className="px-4 py-3 text-slate-700">{c.contract}</td>
                <td className="px-4 py-3">
                  <a
                    href={c.source.url}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="text-xs text-brand-700 underline-offset-2 hover:underline"
                  >
                    {c.source.label} ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
