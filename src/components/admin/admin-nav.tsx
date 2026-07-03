"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard/admin", label: "Overview", exact: true },
  { href: "/dashboard/admin/leads", label: "Leads" },
  { href: "/dashboard/admin/invites", label: "Invites" },
  { href: "/dashboard/admin/verifications", label: "Verifications" },
  { href: "/dashboard/admin/submissions", label: "Submissions" },
  { href: "/dashboard/admin/updates", label: "Update requests" },
  { href: "/dashboard/admin/proposals", label: "Proposals" },
  { href: "/dashboard/admin/rfps", label: "RFPs" },
  { href: "/dashboard/admin/referrals", label: "Referrals" },
  { href: "/dashboard/admin/realtors", label: "Realtors" },
  { href: "/dashboard/admin/media-candidates", label: "Media" },
  { href: "/dashboard/admin/suggestions", label: "Suggestions" },
  { href: "/dashboard/admin/projects", label: "Projects" },
  { href: "/dashboard/admin/discovery", label: "Discovery" },
  { href: "/dashboard/admin/email-intake", label: "Email intake" },
  { href: "/dashboard/admin/rewards", label: "Rewards" },
  { href: "/dashboard/admin/settings", label: "Settings" },
];

export function AdminNav({
  counts = {},
}: {
  /** Pending-work count per tab href (see lib/admin-counts) — 0 hides the badge. */
  counts?: Record<string, number>;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        const pending = counts[tab.href] ?? 0;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium",
              active
                ? "border-brand-600 text-ink"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
            {pending > 0 ? (
              <span
                aria-label={`${pending} pending`}
                className="inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-4 text-white"
              >
                {pending > 99 ? "99+" : pending}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
