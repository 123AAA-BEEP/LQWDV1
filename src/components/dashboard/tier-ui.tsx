import Link from "next/link";
import { Sparkles, Zap, Lock } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Pro = paid self-serve tooling tier. Teal/brand, approachable.
 */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-800",
        className,
      )}
    >
      <Zap className="size-3" strokeWidth={2} aria-hidden />
      Pro
    </span>
  );
}

/**
 * Ultra = invitation-only Deal Desk prestige tier. Amber-on-ink, exclusive.
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
 * "Locked but visible" teaser. Renders representative content blurred behind a
 * scrim with a tier lockup, value line, and a single CTA. Used to entice
 * upgrades (Pro) and convey exclusivity (Ultra). No real data is legible.
 */
export function LockedTease({
  tier,
  title,
  blurb,
  cta,
  href,
  children,
}: {
  tier: "pro" | "ultra";
  title: string;
  blurb: string;
  cta?: { label: string; href: string } | null;
  href?: string;
  children: React.ReactNode;
}) {
  const isUltra = tier === "ultra";
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <div aria-hidden className="pointer-events-none select-none blur-[6px] saturate-50">
        {children}
      </div>
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center backdrop-blur-[2px]",
          isUltra ? "bg-ink/80" : "bg-white/70",
        )}
      >
        {isUltra ? <UltraBadge size="md" /> : <ProBadge />}
        <div>
          <p className={cn("text-sm font-semibold", isUltra ? "text-white" : "text-ink")}>
            {title}
          </p>
          <p
            className={cn(
              "mx-auto mt-1 max-w-sm text-sm leading-relaxed",
              isUltra ? "text-slate-300" : "text-slate-600",
            )}
          >
            {blurb}
          </p>
        </div>
        {cta ? (
          <Link
            href={cta.href}
            className={cn(
              "mt-1 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors",
              isUltra
                ? "border border-amber-400/50 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20"
                : "bg-ink text-white hover:bg-slate-800",
            )}
          >
            {isUltra ? <Lock className="size-3.5" aria-hidden /> : <Zap className="size-3.5" aria-hidden />}
            {cta.label}
          </Link>
        ) : null}
      </div>
      {href ? <Link href={href} className="absolute inset-0" aria-label={title} /> : null}
    </div>
  );
}
