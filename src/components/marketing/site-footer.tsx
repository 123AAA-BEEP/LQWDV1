import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-ink">{BRAND.name}</div>
          <p className="mt-1 text-sm text-slate-500">
            The ultimate broker portal for new homes in Ontario. Built in
            Canada.
          </p>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/login" className="hover:text-slate-900">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-slate-900">
            Sign up
          </Link>
        </nav>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {BRAND.name}. RECO verification required.
        Not affiliated with or endorsed by RECO.
      </div>
    </footer>
  );
}
