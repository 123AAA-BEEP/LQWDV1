import type { Metadata } from "next";
import { AuditForm } from "./audit-form";

export const metadata: Metadata = {
  title: "See What Google Thinks of You — Free Check-Up for Ontario Agents",
  description:
    "Enter your name and brokerage. In about a minute, see what a buyer sees when they Google you — reviews, website, hours, photos, category — and exactly what to fix. Free, no account needed.",
  alternates: { canonical: "/audit" },
};

/**
 * The free audit — the top of the agent-acquisition funnel (campaign plan
 * 2026-09, §5). Same opener the expensive platforms' sales reps use, minus
 * the sales rep: the report is the product, the free account is the fix.
 */
export default function AuditPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
            Free · about a minute
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            See what Google thinks of you.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            When a buyer types your name into Google, what do they see? Your
            reviews, your website, your hours, your photos, and whether Google
            even files you as a real estate agent. Find out, and get the fix for
            each one.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
              <span>
                <span className="font-medium text-ink">Eight checks, plain language.</span>{" "}
                Found or not, reviews, rating, website, phone, hours, photos,
                category, and whether your brokerage is identified the way RECO
                expects.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
              <span>
                <span className="font-medium text-ink">Nothing invented.</span> We read
                your public Google listing and report what&apos;s there. No estimates,
                no scare numbers.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
              <span>
                <span className="font-medium text-ink">No account needed.</span> The
                report goes to your inbox. If you want us to fix it, a free LIQWD
                account is the next step, not a sales call.
              </span>
            </li>
          </ul>
          <p className="mt-8 text-xs text-slate-400">
            Your Google Business Profile is the listing that appears beside the map
            when someone searches your name. This check-up reads it the way a buyer
            would. It doesn&apos;t change anything.
          </p>
        </div>
        <div className="lg:pt-6">
          <AuditForm />
        </div>
      </div>
    </div>
  );
}
