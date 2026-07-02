/** Skeleton for every dashboard segment without its own loading.tsx — the
 * dashboard layout + pages are force-dynamic, so navigation into them must
 * never look frozen. */
export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}
