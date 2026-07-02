/** Instant feedback while /login or /signup server-renders (renders inside the
 * auth layout's card slot). Cold visitors from a claim link land here first. */
export default function AuthLoading() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span
        className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"
        aria-hidden
      />
      <p className="mt-6 text-sm text-slate-500">One moment…</p>
    </div>
  );
}
