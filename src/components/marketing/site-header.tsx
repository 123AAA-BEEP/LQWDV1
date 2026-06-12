import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-baseline gap-0.5">
          <span className="text-xl font-semibold tracking-tight text-ink">
            {BRAND.name}
          </span>
          <span aria-hidden className="size-1.5 rounded-full bg-brand-500" />
        </Link>
        <nav className="flex items-center gap-3">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" variant="primary" size="sm">
            Sign up free
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
