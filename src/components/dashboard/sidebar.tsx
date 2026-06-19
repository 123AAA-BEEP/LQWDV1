"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileText,
  ClipboardList,
  Handshake,
  Bell,
  UserCircle,
  ShieldCheck,
  CreditCard,
  Zap,
  Sparkles,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";
import { ProBadge, UltraBadge } from "@/components/dashboard/tier-ui";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  ultra?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/projects", label: "Projects", icon: Building2 },
  { href: "/dashboard/submit", label: "Submit project", icon: PlusCircle },
  { href: "/dashboard/proposals", label: "My proposals", icon: FileText },
  { href: "/dashboard/buyer-mandates", label: "Buyer Mandates", icon: ClipboardList },
  { href: "/dashboard/deal-desk", label: "Deal Desk", icon: Handshake, ultra: true },
  { href: "/dashboard/updates", label: "My updates", icon: Bell },
  { href: "/dashboard/refer", label: "Refer & earn", icon: Gift },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
];

// Developers get a trimmed, role-appropriate nav.
const DEV_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/deal-requests", label: "Move Inventory", icon: Handshake },
  { href: "/dashboard/buyer-mandates", label: "Ready Buyers", icon: ClipboardList },
  { href: "/dashboard/developer", label: "Connections", icon: CreditCard },
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
  isPro = false,
  isUltra = false,
  isDeveloper = false,
}: {
  name: string;
  email: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isPro?: boolean;
  isUltra?: boolean;
  isDeveloper?: boolean;
}) {
  const pathname = usePathname();
  const nav: NavItem[] = isDeveloper
    ? DEV_NAV
    : isAdmin
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
        {isDeveloper ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Developer
          </span>
        ) : isUltra ? (
          <UltraBadge />
        ) : isPro ? (
          <ProBadge />
        ) : null}
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
              <span className="flex-1">{item.label}</span>
              {/* Deal Desk carries the Ultra mark — a visible aspirational cue. */}
              {item.ultra && !isUltra ? (
                <Sparkles className="size-3.5 text-amber-400" aria-hidden />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Pro upgrade chip — only for free realtors (not Pro/Ultra, not devs). */}
      {!isPro && !isUltra && !isDeveloper ? (
        <div className="px-3 pb-1">
          <Link
            href="/dashboard/upgrade"
            className="group flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 transition-colors hover:border-brand-300 hover:bg-brand-100"
          >
            <Zap className="size-4 shrink-0 text-brand-600" strokeWidth={2} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold leading-tight text-brand-900">
                Upgrade to Pro
              </span>
              <span className="block truncate text-xs text-brand-700">
                Premium tools for your pipeline
              </span>
            </span>
            <span
              aria-hidden
              className="text-brand-600 transition-transform group-hover:translate-x-0.5"
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
