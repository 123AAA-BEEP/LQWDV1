"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/dashboard/admin", label: "Overview", exact: true },
  { href: "/dashboard/admin/verifications", label: "Verifications" },
  { href: "/dashboard/admin/submissions", label: "Submissions" },
  { href: "/dashboard/admin/updates", label: "Update requests" },
  { href: "/dashboard/admin/projects", label: "Projects" },
  { href: "/dashboard/admin/settings", label: "Settings" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              active
                ? "border-brand-600 text-ink"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
