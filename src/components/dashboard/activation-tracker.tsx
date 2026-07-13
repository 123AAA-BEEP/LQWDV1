import Link from "next/link";
import { Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Activation progress tracker — the "pizza tracker" for a realtor's journey
 * from signup to first real action. Pure server component, zero dependencies:
 * state is DERIVED entirely from current data by the caller, never from an
 * assumed order (auto-verification can complete several steps at once, and a
 * step can be done while an earlier one isn't).
 */

export type StepState = "done" | "active" | "blocked" | "todo";

export interface ActivationStep {
  key: string;
  label: string;
  /** One-liner under the label — used to make waits feel alive. */
  sub?: string;
  state: StepState;
  href?: string;
}

function Dot({ state, index }: { state: StepState; index: number }) {
  if (state === "done") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
        <Check aria-hidden className="size-4" strokeWidth={3} />
      </span>
    );
  }
  if (state === "blocked") {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
        <AlertCircle aria-hidden className="size-4" />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        state === "active"
          ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
          : "bg-slate-100 text-slate-400",
      )}
    >
      {index + 1}
    </span>
  );
}

export function ActivationTracker({ steps }: { steps: ActivationStep[] }) {
  const doneCount = steps.filter((s) => s.state === "done").length;

  return (
    <section
      aria-label="Account setup progress"
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">Your setup</h2>
        <span className="text-xs text-slate-500">
          {doneCount}/{steps.length} complete
        </span>
      </div>

      <ol className="mt-4 flex gap-0 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const body = (
            <div className="flex flex-col items-start gap-2">
              <div className="flex w-full items-center">
                <Dot state={step.state} index={i} />
                {i < steps.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "mx-1.5 h-0.5 w-full min-w-6 rounded",
                      step.state === "done" ? "bg-brand-300" : "bg-slate-200",
                    )}
                  />
                ) : null}
              </div>
              <div className="pr-4">
                <p
                  className={cn(
                    "text-xs font-medium leading-tight",
                    step.state === "done"
                      ? "text-slate-500"
                      : step.state === "blocked"
                        ? "text-red-600"
                        : step.state === "active"
                          ? "text-ink"
                          : "text-slate-400",
                  )}
                >
                  {step.label}
                </p>
                {step.sub ? (
                  <p className="mt-0.5 max-w-[10.5rem] text-[11px] leading-snug text-slate-400">
                    {step.sub}
                  </p>
                ) : null}
              </div>
            </div>
          );
          return (
            <li key={step.key} className="min-w-0 flex-1" style={{ minWidth: "8.5rem" }}>
              {step.href && step.state !== "done" ? (
                <Link href={step.href} className="block rounded-lg p-1 -m-1 hover:bg-slate-50">
                  {body}
                </Link>
              ) : (
                <div className="p-1 -m-1">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
