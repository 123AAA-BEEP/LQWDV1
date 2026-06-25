import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  QUALIFY_QUESTIONS,
  BUYER_OBJECTIONS,
  NEXT_COMMITMENTS,
  FOLLOWUP_SEQUENCE,
  PRECON_EXPLAINER,
} from "@/lib/training";

/**
 * Contextual, on-the-project follow-up guide so a resale agent can work a
 * pre-construction lead with no prior experience: qualify, position, handle
 * objections, ask for the next step, and follow up — all reusing the playbook
 * content. Native <details> for the longer lists (no client JS needed).
 */
export function WorkThisLead() {
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Work this lead</h2>
          <p className="mt-1 text-sm text-slate-600">
            A quick pre-construction follow-up guide — no experience needed.
          </p>
        </div>
        <Link
          href="/dashboard/learn"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          <BookOpen className="size-4" aria-hidden />
          Full playbook
        </Link>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            1 · Qualify
          </p>
          <ul className="mt-2 space-y-1.5">
            {QUALIFY_QUESTIONS.map((q) => (
              <li key={q} className="flex gap-2 text-sm text-slate-700">
                <span aria-hidden className="text-brand-500">
                  →
                </span>
                {q}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            2 · Position it
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {PRECON_EXPLAINER}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          3 · Ask for the next step
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {NEXT_COMMITMENTS.map((c) => (
            <li
              key={c}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <details className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Common objections &amp; responses
          </summary>
          <ul className="mt-3 space-y-2.5">
            {BUYER_OBJECTIONS.map((o) => (
              <li key={o.objection}>
                <p className="text-sm font-medium text-slate-800">
                  “{o.objection}”
                </p>
                <p className="text-sm leading-relaxed text-slate-600">
                  {o.response}
                </p>
              </li>
            ))}
          </ul>
        </details>
        <details className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">
            Follow-up cadence
          </summary>
          <ul className="mt-3 space-y-2">
            {FOLLOWUP_SEQUENCE.map((s) => (
              <li key={s.when} className="text-sm">
                <span className="font-semibold text-brand-700">{s.when}:</span>{" "}
                <span className="text-slate-600">{s.action}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
