import Link from "next/link";
import { BRAND, DISCLAIMER } from "@/lib/brand";
import { REGIONS, REGION_KEYS, regionSlug } from "@/lib/regions";

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
            The Ultimate Broker Portal for new homes. Built in Canada.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            {REGION_KEYS.map((k) => (
              <Link
                key={k}
                href={`/agents/${regionSlug(k)}`}
                className="hover:text-ink hover:underline"
              >
                {REGIONS[k].label}
              </Link>
            ))}
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
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs leading-relaxed text-slate-400">{DISCLAIMER}</p>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </span>
          <span>
            Licence verification required (RECO / BCFSA / RECA / FL DBPR). Not
            affiliated with or endorsed by any regulator.
          </span>
        </div>
      </div>
    </footer>
  );
}
