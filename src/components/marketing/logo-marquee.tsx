export type BrokerageLogo = {
  name: string;
  /**
   * Path to a logo under /public, e.g. "/logos/acme.svg".
   * When omitted, a neutral placeholder wordmark is rendered instead.
   */
  src?: string;
};

/**
 * Slow, continuous logo marquee for the landing page.
 * Pure CSS animation (no dependencies); pauses on hover, fades at the edges,
 * and respects prefers-reduced-motion (see globals.css).
 */
export function LogoMarquee({
  logos,
  label,
}: {
  logos: readonly BrokerageLogo[];
  label?: string;
}) {
  // Duplicate the track so the loop is seamless (-50% lands copy 2 on copy 1).
  const track = [...logos, ...logos];

  return (
    <section className="border-y border-slate-200 bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-6">
        {label ? (
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
        ) : null}

        <div className="marquee-mask group mt-8 overflow-hidden">
          <ul className="animate-marquee flex w-max items-center gap-x-14 group-hover:[animation-play-state:paused]">
            {track.map((logo, i) => (
              <li
                key={`${logo.name}-${i}`}
                aria-hidden={i >= logos.length}
                className="flex shrink-0 items-center"
              >
                <LogoTile logo={logo} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function LogoTile({ logo }: { logo: BrokerageLogo }) {
  if (logo.src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- decorative, CSS-sized logo
      <img
        src={logo.src}
        alt={logo.name}
        loading="lazy"
        className="h-10 w-auto max-h-10 object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
      />
    );
  }

  // Placeholder wordmark — replace by adding a `src` for this brokerage.
  return (
    <span className="flex items-center gap-2 text-slate-400 transition-colors hover:text-slate-600">
      <span aria-hidden className="size-2 rounded-full bg-current" />
      <span className="text-lg font-semibold tracking-tight">{logo.name}</span>
    </span>
  );
}
