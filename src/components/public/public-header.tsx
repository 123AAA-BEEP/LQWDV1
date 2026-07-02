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
        <nav className="flex items-center gap-4 text-sm font-medium sm:gap-6">
          {/* The marketplace's own action leads; cross-links stay quiet. */}
          <Link href="/projects" className="font-semibold text-ink">
            New homes
          </Link>
          <Link
            href="/developers"
            className="hidden text-slate-500 hover:text-ink sm:inline"
          >
            For developers
          </Link>
          <Link href="/" className="text-slate-500 hover:text-ink">
            For agents
          </Link>
        </nav>
      </div>
    </header>
  );
}
