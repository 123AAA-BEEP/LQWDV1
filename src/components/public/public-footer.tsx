import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Consumer-facing footer for the public marketplace. */
export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-semibold tracking-tight text-ink">
              {BRAND.name}
            </span>
            <span aria-hidden className="size-1 rounded-full bg-brand-500" />
          </div>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
            New construction homes across Canada &amp; the U.S. — Ontario, BC,
            Alberta, Florida, Tennessee, and California.
          </p>
        </div>
        <nav className="flex items-center gap-6 text-sm text-slate-600">
          <Link href="/projects" className="hover:text-ink">
            New homes
          </Link>
          <Link href="/rentals" className="hover:text-ink">
            Rentals
          </Link>
          <Link href="/" className="hover:text-ink">
            For agents
          </Link>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </span>
          <span>
            New-home information is provided for general purposes and may
            change without notice.
          </span>
        </div>
      </div>
    </footer>
  );
}
