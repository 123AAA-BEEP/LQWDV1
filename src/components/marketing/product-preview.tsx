/**
 * Framed product preview shown in the hero.
 *
 * This renders an on-brand SKELETON of the broker portal so the hero has a
 * visual anchor before real screenshots exist. To use a real screenshot, add
 * it to /public/screenshots and replace the placeholder block below with:
 *
 *   import Image from "next/image";
 *   <Image
 *     src="/screenshots/dashboard.png"
 *     alt="The LIQWD broker portal"
 *     width={2560}
 *     height={1600}
 *     className="w-full"
 *     priority
 *   />
 */
export function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span aria-hidden className="size-3 rounded-full bg-slate-300" />
        <span aria-hidden className="size-3 rounded-full bg-slate-300" />
        <span aria-hidden className="size-3 rounded-full bg-slate-300" />
        <span aria-hidden className="ml-3 h-5 w-64 max-w-[40%] rounded-md bg-slate-200" />
      </div>

      {/* PLACEHOLDER portal preview — swap for a real screenshot (see file header). */}
      <div className="flex gap-4 p-4 sm:gap-6 sm:p-6" aria-hidden>
        {/* Sidebar */}
        <div className="hidden w-40 shrink-0 flex-col gap-3 sm:flex">
          <div className="h-7 w-24 rounded-md bg-slate-100" />
          <div className="mt-2 h-4 w-full rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
          <div className="h-4 w-4/6 rounded bg-slate-100" />
          <div className="h-4 w-5/6 rounded bg-slate-100" />
          <div className="mt-auto h-9 w-full rounded-lg bg-brand-500/10" />
        </div>

        {/* Main panel */}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="h-6 w-40 rounded-md bg-slate-200" />
            <div className="h-8 w-28 rounded-lg bg-ink/90" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="h-20 w-full rounded-lg bg-slate-100" />
                <div className="mt-3 h-3 w-3/4 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                <div className="mt-3 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-brand-500" />
                  <div className="h-2.5 w-16 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
