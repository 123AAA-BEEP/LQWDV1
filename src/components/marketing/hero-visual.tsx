import { HERO_VISUAL } from "@/lib/brand";

/**
 * Hero visual: the supplied skyline image in a rounded frame, with a frosted
 * teal value card overlaid on the clean upper-left sky. The card is rendered
 * in code (not baked into the image) so its copy and accent stay editable.
 */
export function HeroVisual() {
  const { src, alt, card } = HERO_VISUAL;
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- hero LCP image, CSS-sized */}
        <img
          src={src}
          alt={alt}
          fetchPriority="high"
          className="block aspect-square w-full object-cover"
        />
      </div>

      {/* Frosted value card */}
      <div className="absolute left-4 top-4 max-w-[15rem] rounded-2xl bg-white/70 p-4 shadow-lg ring-1 ring-white/60 backdrop-blur-md sm:left-6 sm:top-6">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
          <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
          {card.eyebrow}
        </p>
        <p className="mt-2 text-xl font-semibold tracking-tight text-ink">
          {card.title}
        </p>
        <p className="mt-1 text-sm leading-snug text-slate-600">{card.body}</p>
      </div>
    </div>
  );
}
