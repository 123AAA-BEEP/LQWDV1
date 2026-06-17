"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Bell,
  UserCircle,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";
import { UltraBadge } from "@/components/dashboard/ultra";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: Building2 },
  { href: "/dashboard/submit", label: "Submit project", icon: PlusCircle },
  { href: "/dashboard/updates", label: "My updates", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function Sidebar({
  name,
  email,
  avatarUrl,
  isAdmin = false,
  isUltra = false,
}: {
  name: string;
  email: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isUltra?: boolean;
}) {
  const pathname = usePathname();
  const nav: NavItem[] = isAdmin
    ? [...NAV, { href: "/dashboard/admin", label: "Admin", icon: ShieldCheck }]
    : NAV;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Link
          href="/dashboard"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          {BRAND.name}
        </Link>
        {isUltra ? <UltraBadge /> : null}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-brand-600" : "text-slate-400",
                )}
                strokeWidth={1.75}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Ultra teaser chip — only for non-Ultra members. */}
      {!isUltra ? (
        <div className="px-3 pb-1">
          <Link
            href="/dashboard/ultra"
            className="group flex items-center gap-3 rounded-lg border border-amber-400/30 bg-ink px-3 py-2.5 text-white transition-colors hover:border-amber-400/60"
          >
            <Sparkles
              className="size-4 shrink-0 text-amber-300"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight">
                Upgrade to Ultra
              </span>
              <span className="block truncate text-xs text-slate-400">
                Deeper intel &amp; early access
              </span>
            </span>
            <span
              aria-hidden
              className="text-amber-300 transition-transform group-hover:translate-x-0.5"
            >
              →
            </span>
          </Link>
        </div>
      ) : null}

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 px-2 pb-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800">{name}</p>
            {email ? (
              <p className="truncate text-xs text-slate-400">{email}</p>
            ) : null}
          </div>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
