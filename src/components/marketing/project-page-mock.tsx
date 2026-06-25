/**
 * A stylized mock of a public LIQWD project page with a "Request info" form,
 * rendered in code (no screenshot). It shows where buyer inquiries come from and
 * that they route to the matched realtor — the lead mechanism, made tangible.
 * Decorative marketing element.
 */
export function ProjectPageMock() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5"
    >
      {/* Page hero strip */}
      <div className="relative h-24 bg-gradient-to-br from-brand-100 via-slate-100 to-slate-200">
        <span className="absolute left-4 top-3 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand-700 backdrop-blur">
          Public project page
        </span>
      </div>

      <div className="p-5">
        <p className="text-base font-semibold tracking-tight text-ink">
          Maplewood Towns
        </p>
        <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
          <span>North district</span>
          <span aria-hidden className="size-1 rounded-full bg-slate-300" />
          <span>
            From <span className="font-medium text-ink">$600,000s</span>
          </span>
        </div>

        {/* Request info form */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm font-semibold text-ink">Request info</p>
          <div className="mt-3 space-y-2">
            <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-400">
              Your name
            </div>
            <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-400">
              Email
            </div>
            <div className="flex h-8 items-center justify-center rounded-md bg-brand-600 px-3 text-xs font-semibold text-white">
              Contact agent
            </div>
          </div>
        </div>

        {/* Routing annotation */}
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-brand-700">
          <span aria-hidden className="text-brand-400">
            ↳
          </span>
          Inquiry routes to the matched realtor
        </div>
      </div>
    </div>
  );
}
