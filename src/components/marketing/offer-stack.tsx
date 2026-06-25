import { Fragment } from "react";
import {
  FilePlus2,
  Globe,
  MessageSquareText,
  UserRoundCheck,
  ShieldCheck,
  Check,
  Ban,
  Building2,
  LayoutGrid,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { EARN } from "@/lib/brand";

// Icons for the lead-path nodes (order matches EARN.featured.path).
const PATH_ICONS: LucideIcon[] = [
  FilePlus2,
  Globe,
  MessageSquareText,
  UserRoundCheck,
];

// Icons for the supporting tiles (order matches EARN.supporting).
const TILE_ICONS: LucideIcon[] = [Ban, Building2, LayoutGrid, TrendingUp];

/**
 * "The offer" as an earning-opportunity stack: one dominant featured panel for
 * the free buyer-lead path (with a visual route + a mock inquiry card) beside a
 * lighter column of supporting benefit tiles. Premium prop-tech; navy/teal;
 * fully responsive. Presentational only.
 */
export function OfferStack() {
  const { featured, supporting } = EARN;

  return (
    <div className="mt-12 grid gap-6 lg:grid-cols-5">
      {/* Featured panel — the hero of the section. */}
      <div className="lg:col-span-3">
        <div className="relative h-full overflow-hidden rounded-3xl border border-brand-200 bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-brand-100/60 sm:p-8">
          {/* soft brand wash, top-right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand-50 blur-2xl"
          />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
              {featured.eyebrow}
            </span>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {featured.title}
            </h3>
            <p className="mt-3 max-w-lg text-pretty leading-relaxed text-slate-600">
              {featured.body}
            </p>

            {/* Badges */}
            <ul className="mt-5 flex flex-wrap gap-2">
              {featured.badges.map((badge, i) => (
                <li
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50/70 px-3 py-1 text-xs font-medium text-brand-800"
                >
                  {i === featured.badges.length - 1 ? (
                    <ShieldCheck className="size-3.5" strokeWidth={2} aria-hidden />
                  ) : (
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                  )}
                  {badge}
                </li>
              ))}
            </ul>

            {/* Product zone: the lead path + a sample inquiry. */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              {/* Route line — vertical on mobile, a horizontal rail on sm+. */}
              <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
                {featured.path.map((node, i) => {
                  const Icon = PATH_ICONS[i];
                  return (
                    <Fragment key={node}>
                      <li className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-brand-100">
                          <Icon
                            className="size-4"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </span>
                        <span className="text-sm font-medium text-slate-700 sm:max-w-[5.5rem] sm:text-[11px] sm:leading-tight sm:text-slate-600">
                          {node}
                        </span>
                      </li>
                      {i < featured.path.length - 1 ? (
                        <span
                          aria-hidden
                          className="hidden h-px flex-1 bg-gradient-to-r from-brand-200 to-brand-200/40 sm:mx-2 sm:mt-[1.1rem] sm:block"
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </ol>

              {/* Sample inquiry card */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-brand-500"
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-700">
                    {featured.sample.label}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold text-ink">
                  {featured.sample.project}
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Matched to</dt>
                    <dd className="font-medium text-ink">
                      {featured.sample.matchedTo}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500">Referral fee</dt>
                    <dd className="font-semibold text-brand-700">
                      {featured.sample.referralFee}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting tiles — secondary weight. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-1 lg:gap-4">
        {supporting.map((tile, i) => {
          const Icon = TILE_ICONS[i];
          return (
            <li
              key={tile.title}
              className="flex h-full gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-ink">{tile.title}</h4>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {tile.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
