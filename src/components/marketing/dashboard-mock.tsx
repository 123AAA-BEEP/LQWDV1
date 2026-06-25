/**
 * A stylized mock of the LIQWD realtor dashboard, rendered entirely in code (no
 * screenshot) so it stays crisp, responsive, and on-brand. Decorative — it's a
 * marketing proof point on the realtor landing hero, not a live widget.
 */
const ROWS = [
  {
    name: "Maplewood Towns",
    city: "North district",
    chip: "Matched",
    tone: "brand" as const,
  },
  {
    name: "The Lockwood Residences",
    city: "Lakeside",
    chip: "Buyer inquiry",
    tone: "amber" as const,
  },
  {
    name: "Parkview Condos",
    city: "Uptown",
    chip: "Live",
    tone: "slate" as const,
  },
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
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
    >
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-brand-500" />
          <span className="text-sm font-semibold text-ink">My projects</span>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
          3 matched
        </span>
      </div>

      {/* Project rows */}
      <ul className="divide-y divide-slate-100">
        {ROWS.map((row) => (
          <li key={row.name} className="flex items-center gap-3 px-5 py-3.5">
            <span className="size-9 shrink-0 rounded-lg bg-gradient-to-br from-brand-100 to-slate-200" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{row.name}</p>
              <p className="truncate text-xs text-slate-400">{row.city}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${CHIP_TONE[row.tone]}`}
            >
              {row.chip}
            </span>
          </li>
        ))}
      </ul>

      {/* Footer stat */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-4">
        <span className="text-sm text-slate-500">Bonus commission</span>
        <span className="text-lg font-semibold tracking-tight text-ink">
          Up to 4%
        </span>
      </div>
    </div>
  );
}
