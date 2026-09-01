import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The next-best-action stack — the top of the realtor home (agent-panel UX
 * reorg, Phase 2). A ranked list of 1–4 things that need the agent right
 * now, each with exactly one button, computed from CURRENT state by the
 * caller. Cards expire when done. When nothing is pending, a calm
 * "caught up" card offers one growth action instead of a wall of options.
 * Pure server component.
 */

export type ActionTone = "brand" | "emerald" | "amber" | "red";

export interface ActionItem {
  key: string;
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone?: ActionTone;
}

const TONE: Record<ActionTone, { ring: string; chip: string; icon: string }> = {
  brand: { ring: "border-brand-200 bg-brand-50/60", chip: "bg-brand-100", icon: "text-brand-700" },
  emerald: { ring: "border-emerald-200 bg-emerald-50/60", chip: "bg-emerald-100", icon: "text-emerald-700" },
  amber: { ring: "border-amber-200 bg-amber-50/60", chip: "bg-amber-100", icon: "text-amber-700" },
  red: { ring: "border-red-200 bg-red-50/60", chip: "bg-red-100", icon: "text-red-700" },
};

export function NeedsYou({
  items,
  caughtUp,
}: {
  items: ActionItem[];
  caughtUp: { title: string; body: string; href: string; cta: string };
}) {
  return (
    <section aria-labelledby="needs-you">
      <div className="mb-3 flex items-baseline justify-between">
        <h2
          id="needs-you"
          className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
        >
          {items.length > 0 ? `Needs you · ${items.length}` : "You're caught up"}
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="size-5 text-emerald-700" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-ink">Nothing needs you right now.</p>
              <p className="mt-0.5 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{caughtUp.title}</span>{" "}
                {caughtUp.body}
              </p>
            </div>
          </div>
          <ButtonLink href={caughtUp.href} size="sm" variant="secondary">
            {caughtUp.cta}
          </ButtonLink>
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((it) => {
            const t = TONE[it.tone ?? "brand"];
            const Icon = it.icon;
            return (
              <li
                key={it.key}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5",
                  t.ring,
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                      t.chip,
                    )}
                  >
                    <Icon className={cn("size-5", t.icon)} strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{it.title}</p>
                    <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-slate-600">
                      {it.body}
                    </p>
                  </div>
                </div>
                <ButtonLink href={it.href} size="sm" className="shrink-0">
                  {it.cta}
                </ButtonLink>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
