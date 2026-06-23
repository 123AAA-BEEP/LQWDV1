"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  Coins,
  Compass,
  Settings2,
  Megaphone,
  BarChart3,
  DoorOpen,
  Zap,
  Sparkles,
  Gift,
  Inbox,
  Rocket,
  Link2,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { BRAND } from "@/lib/brand";
import { ProBadge, UltraBadge } from "@/components/dashboard/tier-ui";
import { SECTION_ACCENT, type SectionAccent } from "@/lib/section-accents";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  ultra?: boolean;
};
type NavSection = {
  accent: SectionAccent;
  label: string;
  description?: string;
  icon: LucideIcon;
  items: NavItem[];
};

const HOME: NavItem = {
  href: "/dashboard",
  label: "Dashboard",
  icon: LayoutDashboard,
  exact: true,
};

// ---- Realtor: grouped by intent (earn / explore / manage) -------------------
const REALTOR_SECTIONS: NavSection[] = [
  {
    accent: "emerald",
    label: "Earn",
    description: "Commissions, referrals & rewards",
    icon: Coins,
    items: [
      { href: "/dashboard/quick-wins", label: "Quick Wins", icon: Coins },
      { href: "/dashboard/deal-desk", label: "Developer Deals", icon: Handshake, ultra: true },
      { href: "/dashboard/buyer-mandates", label: "Buyer Matching", icon: ClipboardList },
      { href: "/dashboard/proposals", label: "Negotiate Terms", icon: FileText },
      { href: "/dashboard/refer", label: "Refer & earn", icon: Gift },
    ],
  },
  {
    accent: "sky",
    label: "New Homes",
    description: "Browse projects & broker portals",
    icon: Compass,
    items: [
      { href: "/dashboard/projects", label: "Projects", icon: Building2 },
      { href: "/dashboard/lead-pages", label: "Lead Pages", icon: Link2 },
      { href: "/dashboard/broker-portals", label: "Broker Portals", icon: DoorOpen },
    ],
  },
  {
    accent: "slate",
    label: "Account",
    description: "Profile, submissions & updates",
    icon: Settings2,
    items: [
      { href: "/dashboard/start", label: "Get started", icon: Rocket },
      { href: "/dashboard/submit", label: "Submit project", icon: PlusCircle },
      { href: "/dashboard/updates", label: "Update Requests", icon: Bell },
      { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
    ],
  },
];

// ---- Developer: grouped by core return (transact / promote / research) -------
const DEVELOPER_SECTIONS: NavSection[] = [
  {
    accent: "emerald",
    label: "Sell / Lease now",
    description: "Move inventory — agents & renters",
    icon: Handshake,
    items: [
      { href: "/dashboard/deal-requests", label: "Move Inventory", icon: Handshake },
      { href: "/dashboard/buyer-mandates", label: "Ready Buyers", icon: ClipboardList },
      { href: "/dashboard/referrals", label: "Rental referrals", icon: Inbox },
      { href: "/dashboard/developer", label: "Connections", icon: CreditCard },
    ],
  },
  {
    accent: "amber",
    label: "Promote now",
    description: "Get in front of buyers & agents",
    icon: Megaphone,
    items: [
      { href: "/dashboard/promote", label: "Featured & eBlasts", icon: Megaphone },
    ],
  },
  {
    accent: "sky",
    label: "Research",
    description: "Demand & performance insights",
    icon: BarChart3,
    items: [
      { href: "/dashboard/research", label: "Analytics & demand", icon: BarChart3 },
    ],
  },
  {
    accent: "slate",
    label: "Account",
    description: "Profile & billing",
    icon: Settings2,
    items: [{ href: "/dashboard/profile", label: "Profile", icon: UserCircle }],
  },
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
  planBadge = null,
  statusBadge = null,
}: {
  name: string;
  email: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  isPro?: boolean;
  isUltra?: boolean;
  isDeveloper?: boolean;
  /** Plan / role chip shown in the mobile top bar (e.g. Free plan, Pro). */
  planBadge?: ReactNode;
  /** Verification status chip shown in the mobile top bar. */
  statusBadge?: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const renderItem = (item: NavItem, accent: SectionAccent) => {
    const a = SECTION_ACCENT[accent];
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
            ? a.activeItem
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900",
        )}
      >
        <Icon
          className={cn("size-4 shrink-0", active ? a.activeIcon : "text-slate-400")}
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="flex-1">{item.label}</span>
        {item.ultra && !isUltra ? (
          <Sparkles className="size-3.5 text-amber-400" aria-hidden />
        ) : null}
      </Link>
    );
  };

  const renderSection = (section: NavSection) => {
    const a = SECTION_ACCENT[section.accent];
    const SecIcon = section.icon;
    return (
      <div
        key={section.label}
        className={cn("space-y-0.5 rounded-xl p-1.5 ring-1 ring-inset", a.zone)}
      >
        <div className="flex items-start gap-2 px-2 pb-1.5 pt-0.5">
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
              a.chip,
            )}
          >
            <SecIcon className="size-3" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span
              className={cn(
                "block text-[11px] font-semibold uppercase tracking-[0.12em]",
                a.header,
              )}
            >
              {section.label}
            </span>
            {section.description ? (
              <span className="mt-0.5 block text-[10px] leading-tight text-slate-400">
                {section.description}
              </span>
            ) : null}
          </span>
        </div>
        {section.items.map((item) => renderItem(item, section.accent))}
      </div>
    );
  };

  // Home link — neutral, above the color-coded zones.
  const homeActive = pathname === "/dashboard";
  const homeLink = (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        homeActive
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <LayoutDashboard
        className={cn("size-4 shrink-0", homeActive ? "text-slate-600" : "text-slate-400")}
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="flex-1">{HOME.label}</span>
    </Link>
  );

  const sections = isDeveloper
    ? DEVELOPER_SECTIONS
    : isAdmin
      ? REALTOR_SECTIONS.map((s) =>
          s.accent === "slate"
            ? {
                ...s,
                items: [
                  ...s.items,
                  {
                    href: "/dashboard/admin",
                    label: "Admin",
                    icon: ShieldCheck,
                  },
                ],
              }
            : s,
        )
      : REALTOR_SECTIONS;

  // Brand tier chip shown beside the LIQWD wordmark in the rail/drawer header.
  const tierBadge = isDeveloper ? (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
      Developer
    </span>
  ) : isUltra ? (
    <UltraBadge />
  ) : isPro ? (
    <ProBadge />
  ) : null;

  // Scrollable nav + upgrade chip + account footer — shared by the desktop
  // rail and the mobile drawer.
  const navBody = (
    <>
      <nav className="flex-1 space-y-3 overflow-y-auto p-3">
        {homeLink}
        {sections.map(renderSection)}
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
    </>
  );

  return (
    <>
      {/* Desktop rail — hidden on small screens. */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col self-start border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link
            href="/dashboard"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            {BRAND.name}
          </Link>
          {tierBadge}
        </div>
        {navBody}
      </aside>

      {/* Mobile top bar — hamburger + brand + plan/status chips. */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="-ml-1 flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Menu className="size-5" strokeWidth={1.75} aria-hidden />
        </button>
        <Link
          href="/dashboard"
          className="text-base font-semibold tracking-tight text-ink"
        >
          {BRAND.name}
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          {planBadge}
          {statusBadge}
        </div>
      </header>

      {/* Mobile drawer — overlay rail. */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-slate-900/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="text-lg font-semibold tracking-tight text-ink"
              >
                {BRAND.name}
              </Link>
              {tierBadge}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="-mr-1 flex size-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="size-5" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
          {/* Close the drawer when a nav link inside it is tapped. */}
          <div
            className="contents"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            {navBody}
          </div>
        </aside>
      </div>
    </>
  );
}
