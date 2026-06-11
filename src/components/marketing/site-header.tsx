import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-ink">
            {BRAND.name}
          </span>
        </Link>
        <nav className="flex items-center gap-2">
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
