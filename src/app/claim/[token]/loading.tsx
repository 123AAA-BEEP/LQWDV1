/**
 * Shown instantly while the claim page verifies the link server-side (token
 * lookup + session check). Cold visitors from an email must never stare at a
 * blank screen wondering if the link worked.
 */
export default function ClaimLoading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 py-12 text-center">
      <p className="mb-8 text-xl font-bold tracking-tight text-ink">LIQWD</p>
      <span
        className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"
        aria-hidden
      />
      <h1 className="mt-6 text-lg font-semibold text-ink">
        Verifying your claim link…
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        One moment — we&apos;re pulling up your listing.
      </p>
    </main>
  );
}
