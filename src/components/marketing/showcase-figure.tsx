import type { ShowcaseCaption } from "@/lib/brand";

/**
 * A framed showcase image with an optional frosted "glass" caption overlaid in
 * the upper-left — the same treatment as the hero value card (HeroVisual), so
 * the editorial sections on the realtor and developer landing pages read as one
 * consistent system. The caption copy lives in code (brand.ts), not baked into
 * the image, so it stays editable and on-brand.
 */
export function ShowcaseFigure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: ShowcaseCaption;
}) {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- marketing asset, CSS-sized */}
        <img src={src} alt={alt} loading="lazy" className="block w-full" />
      </div>

      {caption ? (
        <div className="absolute left-4 top-4 max-w-[15rem] rounded-2xl bg-white/70 p-4 shadow-lg ring-1 ring-white/60 backdrop-blur-md sm:left-6 sm:top-6">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
            <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
            {caption.eyebrow}
          </p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-ink">
            {caption.title}
          </p>
          <p className="mt-1 text-sm leading-snug text-slate-600">
            {caption.body}
          </p>
        </div>
      ) : null}
    </div>
  );
}
