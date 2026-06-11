import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <Link href="/" className="text-xl font-semibold tracking-tight text-ink">
            {BRAND.name}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="text-center">
          <p className="text-sm font-medium text-brand-700">404</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
            Page not found
          </h1>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            The page you’re looking for doesn’t exist or may have been moved.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <ButtonLink href="/">Back to home</ButtonLink>
            <ButtonLink href="/dashboard" variant="secondary">
              Go to dashboard
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
