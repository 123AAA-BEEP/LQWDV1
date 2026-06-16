"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  badge?: number;
}

export function Sidebar({
  name,
  email,
  isAdmin = false,
  isDeveloper = false,
  unreadCount = 0,
}: {
  name: string;
  email: string | null;
  isAdmin?: boolean;
  isDeveloper?: boolean;
  unreadCount?: number;
}) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", exact: true },
    { href: "/dashboard/opportunities", label: "Opportunities" },
    { href: "/dashboard/projects", label: "Projects" },
    { href: "/dashboard/submit", label: "Submit project" },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      badge: unreadCount,
    },
    { href: "/dashboard/updates", label: "My updates" },
    { href: "/dashboard/profile", label: "Profile" },
  ];

  if (isDeveloper) {
    nav.splice(1, 0, {
      href: "/dashboard/developer",
      label: "Developer console",
    });
  }

  if (isAdmin) {
    nav.push({ href: "/dashboard/admin", label: "Admin" });
  }

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center border-b border-slate-200 px-5">
        <Link href="/dashboard" className="text-lg font-semibold text-ink">
          {BRAND.name}
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
                active
                  ? "bg-slate-100 text-ink"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <span>{item.label}</span>
              {item.badge ? (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
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
