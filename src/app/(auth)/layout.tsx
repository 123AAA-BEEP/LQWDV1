import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-md px-4 py-5">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-ink"
          >
            {BRAND.name}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
