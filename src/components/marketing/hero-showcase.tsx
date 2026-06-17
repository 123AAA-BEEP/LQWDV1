import { SHOWCASE } from "@/lib/brand";

/**
 * Visual showcase band directly below the hero. Leads with the wide
 * commission image, then the two square deal images side by side. Images are
 * shown at their natural aspect ratio so the overlay cards are never cropped.
 */
export function HeroShowcase() {
  const { commission, flashSale, discount } = SHOWCASE.images;
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
      <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
        <span aria-hidden className="h-px w-8 bg-brand-500" />
        {SHOWCASE.label}
      </p>
      <h2 className="mt-6 max-w-3xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {SHOWCASE.heading}
      </h2>

      <div className="mt-12 space-y-5">
        <Frame {...commission} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Frame {...flashSale} />
          <Frame {...discount} />
        </div>
      </div>
    </section>
  );
}

function Frame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element -- marketing asset, CSS-sized */}
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </div>
  );
}
