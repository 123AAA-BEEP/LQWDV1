import {
  HeartPulse,
  ShoppingBag,
  School,
  GraduationCap,
  TrainFront,
  ShoppingCart,
  Trees,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { NeighbourhoodFeatures } from "@/lib/types";

// Display priority (the order features are surfaced in).
const ORDER: Array<{
  key: keyof NeighbourhoodFeatures;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "hospitals", label: "Hospitals", icon: HeartPulse },
  { key: "shopping", label: "Shopping", icon: ShoppingBag },
  { key: "schools", label: "Schools", icon: School },
  { key: "postsecondary", label: "Universities & colleges", icon: GraduationCap },
  { key: "transit", label: "Transit", icon: TrainFront },
  { key: "groceries", label: "Groceries", icon: ShoppingCart },
  { key: "parks", label: "Parks & trails", icon: Trees },
  { key: "poi", label: "Points of interest", icon: Landmark },
];

function fmtDist(m: number): string {
  return m < 950 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

/** True when there's at least one real nearby feature to show. Lets callers
 *  skip the section wrapper for empty / `_unresolved` records. */
export function hasNeighbourhood(
  features: NeighbourhoodFeatures | null | undefined,
): boolean {
  if (!features) return false;
  return ORDER.some((c) => (features[c.key] ?? []).length > 0);
}

/**
 * Structured "what's nearby" block, rendered from the OSM-sourced
 * neighbourhood_features (real, named places + straight-line distances). Shows
 * categories in priority order, nearest first; omits empty categories and
 * renders nothing when there's no data. Presentational; used on the public
 * project page, the broker project view, and the quick-fact sheet.
 */
export function NeighbourhoodBlock({
  features,
  title,
  limit = 3,
}: {
  features: NeighbourhoodFeatures | null | undefined;
  /** Optional heading; omit when the caller supplies its own section title. */
  title?: string;
  limit?: number;
}) {
  if (!features) return null;
  const groups = ORDER.map((c) => ({
    ...c,
    items: (features[c.key] ?? []).slice(0, limit),
  })).filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <div>
      {title ? (
        <h2 className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
      ) : null}
      <div
        className={`grid gap-x-8 gap-y-5 sm:grid-cols-2 ${title ? "mt-4" : ""}`}
      >
        {groups.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.key}>
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Icon className="size-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                {g.label}
              </p>
              <ul className="mt-2 space-y-1.5">
                {g.items.map((it) => (
                  <li
                    key={it.name}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-slate-700">
                      {it.name}
                      {typeof it.rank === "number" ? (
                        <span className="ml-1.5 rounded bg-brand-50 px-1 py-0.5 text-[10px] font-medium text-brand-700">
                          EQAO {it.rank}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 tabular-nums text-slate-400">
                      {fmtDist(it.distance_m)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-slate-400">
        Nearby places and straight-line distances from public map data
        (OpenStreetMap).
      </p>
    </div>
  );
}
