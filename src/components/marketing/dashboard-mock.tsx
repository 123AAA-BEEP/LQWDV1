/**
 * A compact, frosted mock of the LIQWD realtor dashboard, rendered in code (no
 * screenshot). Sized and styled to match the other hero/showcase overlay cards
 * (~15rem, bg-white/80 backdrop-blur) so it sits over the skyline image without
 * covering it. Decorative marketing proof point.
 */
const ROWS = [
  { name: "Maplewood Towns", chip: "Matched", tone: "brand" as const },
  { name: "The Lockwood Residences", chip: "New lead", tone: "amber" as const },
  { name: "Parkview Condos", chip: "Live", tone: "slate" as const },
];

const CHIP_TONE: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function DashboardMock() {
  return (
    <div
      aria-hidden
      className="w-[15rem] overflow-hidden rounded-2xl bg-white/80 shadow-lg ring-1 ring-white/60 backdrop-blur-md"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between px-3.5 pt-3.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
          My projects
        </span>
        <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
          3 matched
        </span>
      </div>

      {/* Project rows (single line, to stay compact) */}
      <ul className="mb-1 mt-2.5 divide-y divide-slate-200/70 pb-1">
        {ROWS.map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between gap-2 px-3.5 py-2"
          >
            <span className="truncate text-xs font-medium text-ink">
              {row.name}
            </span>
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CHIP_TONE[row.tone]}`}
            >
              {row.chip}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
