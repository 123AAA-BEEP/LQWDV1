import Link from "next/link";
import { BRAND } from "@/lib/brand";

/** Consumer-facing header for the public marketplace (no broker-portal CTAs). */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/projects" className="flex items-baseline gap-0.5">
          <span className="text-xl font-semibold tracking-tight text-ink">
            {BRAND.name}
          </span>
          <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/projects" className="hover:text-ink">
            New homes
          </Link>
          <Link href="/" className="text-slate-500 hover:text-ink">
            For agents →
          </Link>
        </nav>
      </div>
    </header>
  );
}
