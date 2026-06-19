"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";
import { VERIFICATION_LABELS, type VerificationStatus } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/submit", label: "Submit project" },
  { href: "/dashboard/updates", label: "My updates" },
  { href: "/dashboard/profile", label: "Profile" },
];

const STATUS_STYLES: Record<VerificationStatus, string> = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  rejected: "bg-red-50 text-red-700 ring-red-200",
  suspended: "bg-red-50 text-red-700 ring-red-200",
};

export function Sidebar({
  name,
  email,
  verificationStatus,
  isAdmin = false,
}: {
  name: string;
  email: string | null;
  verificationStatus: VerificationStatus;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const nav = isAdmin
    ? [...NAV, { href: "/dashboard/admin", label: "Admin" }]
    : NAV;

  // Membership chip: a persistent status indicator that travels with the
  // toolbar. Actionable (links to verification) unless already approved.
  const chipClass = cn(
    "mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
    STATUS_STYLES[verificationStatus],
  );
  const chipInner = (
    <>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {VERIFICATION_LABELS[verificationStatus]}
    </>
  );

  return (
    <aside className="sticky top-0 flex h-dvh w-60 shrink-0 flex-col self-start border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Link href="/dashboard" className="text-lg font-semibold text-ink">
          {BRAND.name}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-slate-100 text-ink"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="px-2 pb-2">
          <p className="truncate text-sm font-medium text-slate-800">{name}</p>
          {email ? (
            <p className="truncate text-xs text-slate-400">{email}</p>
          ) : null}
          {verificationStatus === "approved" ? (
            <span className={chipClass}>{chipInner}</span>
          ) : (
            <Link href="/dashboard/verify" className={chipClass}>
              {chipInner}
            </Link>
          )}
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
