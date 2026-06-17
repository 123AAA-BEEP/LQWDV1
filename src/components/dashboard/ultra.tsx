import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * LIQWD Ultra brand lockup. Restrained premium signal layered on the core
 * slate + teal system: deep ink surface with a single warm amber hairline.
 * Used wherever Ultra is referenced so the tier reads consistently.
 */
export function UltraBadge({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-ink font-semibold uppercase tracking-[0.18em] text-amber-300",
        size === "sm" ? "px-2.5 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className,
      )}
    >
      <Sparkles className={size === "sm" ? "size-3" : "size-3.5"} aria-hidden />
      Ultra
    </span>
  );
}

/**
 * Wraps any section in a "locked but visible" Ultra teaser: the real content is
 * rendered blurred behind a scrim, with the Ultra lockup, a one-line value
 * prop, and a single CTA. No real data is legible — pure tease, no modal.
 */
export function UltraLock({
  title,
  blurb,
  children,
  cta = "See what's in Ultra",
  href = "/dashboard/ultra",
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
  cta?: string;
  href?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      {/* Real (or representative) content, blurred + dimmed behind the scrim. */}
      <div
        aria-hidden
        className="pointer-events-none select-none blur-[6px] saturate-50"
      >
        {children}
      </div>

      {/* Scrim + lockup */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink/80 px-6 text-center backdrop-blur-[2px]">
        <UltraBadge size="md" />
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-300">
            {blurb}
          </p>
        </div>
        <Link
          href={href}
          className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-400/10 px-3.5 py-1.5 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-400/20"
        >
          <Lock className="size-3.5" aria-hidden />
          {cta}
        </Link>
      </div>
    </div>
  );
}
