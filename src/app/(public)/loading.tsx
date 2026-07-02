/** Instant skeleton while the (force-dynamic) public pages fetch — browsing
 *  and project pages must never show a frozen white screen mid-navigation. */
export default function PublicLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100 sm:h-96" />
      <div className="mt-8 grid gap-10 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
