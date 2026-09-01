import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * The scoreboard — three framed numbers about THE AGENT'S business (never
 * catalog stats), each with a plain-language hint. Answers "is this
 * working?" in five seconds; the full detail lives one click away on the
 * tile's destination. No charts on Home.
 */

export interface ScoreTile {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  href: string;
}

export function Scoreboard({ tiles }: { tiles: ScoreTile[] }) {
  return (
    <section aria-label="Your numbers" className="grid gap-4 sm:grid-cols-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.label}
            href={t.href}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              <Icon className="size-3.5" strokeWidth={2} aria-hidden />
              {t.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-ink">
              {t.value}
            </p>
            <p className="mt-0.5 text-xs text-slate-500 group-hover:text-slate-700">{t.hint}</p>
          </Link>
        );
      })}
    </section>
  );
}
