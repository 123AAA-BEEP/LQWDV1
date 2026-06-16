import { TRUST } from "@/lib/brand";

/**
 * Social-proof band for the realtor landing: "agents from leading brokerages
 * use LIQWD". Renders a logo image when one is set, otherwise a styled
 * wordmark — grayscale, colorizing on hover. Static (not a carousel) for
 * credibility and accessibility.
 */
export function BrokerageStrip() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
        <p className="text-center text-base font-semibold tracking-tight text-brand-800 sm:text-lg">
          {TRUST.heading}
        </p>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:gap-x-16">
          {TRUST.brokerages.map((b) => (
            <li
              key={b.name}
              className="opacity-70 grayscale transition duration-200 hover:opacity-100 hover:grayscale-0"
              title={b.name}
            >
              {b.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.logo} alt={b.name} className="h-7 w-auto sm:h-8" />
              ) : (
                <span className="text-lg font-semibold tracking-tight text-slate-500 sm:text-xl">
                  {b.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
