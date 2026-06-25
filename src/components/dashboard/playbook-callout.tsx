import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";

/**
 * Dashboard objection-handler: names the "I've only sold resale / I don't know
 * pre-construction" fear head-on and points to the playbook. Reassurance + a
 * clear next step, so a resale agent never feels stuck.
 */
export function PlaybookCallout() {
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-inset ring-brand-100">
            <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              New to pre-construction? You don&apos;t need to be an expert.
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              Mostly sold resale? The playbook walks you through qualifying,
              positioning, handling objections, and following up — and every
              project page hands you the facts to do it.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/learn"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Open the playbook
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
