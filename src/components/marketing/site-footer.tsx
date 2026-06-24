import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
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
            The Ultimate Broker Portal for new homes in Ontario. Built in
            Canada.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600">
          <Link href="/login" className="hover:text-ink">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-ink">
            Sign up
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
        </nav>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </span>
          <span>
            RECO verification required. Not affiliated with or endorsed by
            RECO.
          </span>
        </div>
      </div>
    </footer>
  );
}
