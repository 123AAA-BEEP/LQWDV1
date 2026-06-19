/**
 * Dashboard-wide loading fallback. The dashboard is `force-dynamic` and the
 * layout awaits an auth round-trip + profile query before it can render, so
 * without this the navigation (e.g. straight after login) shows a blank screen.
 * This renders an instant content skeleton inside the layout chrome.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
          />
        ))}
      </div>
    </div>
  );
}
