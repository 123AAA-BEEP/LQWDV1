import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * One tab strip for a group of sibling pages that are really one surface
 * (agent-panel UX reorg, Phase 3 — "one page anatomy everywhere"). Routes
 * stay exactly as they were; the strip is what makes three pages read as
 * one marketplace, or two pages read as one "pages that send you leads"
 * tool. Pure server component — each page says which tab it is.
 */

export interface SurfaceTab {
  key: string;
  label: string;
  href: string;
}

export function SurfaceTabs({
  eyebrow,
  tabs,
  active,
  className,
}: {
  eyebrow?: string;
  tabs: SurfaceTab[];
  active: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2", className)}>
      {eyebrow ? (
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          {eyebrow}
        </span>
      ) : null}
      <nav
        aria-label={eyebrow ?? "Sections"}
        className="inline-flex gap-1 rounded-lg bg-slate-100 p-1"
      >
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                on ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// ---- The two consolidated surfaces ------------------------------------------

/** Deal room → one agent marketplace: Assignments · Off-market · Buyer wants. */
export const MARKETPLACE_TABS: SurfaceTab[] = [
  { key: "assignments", label: "Assignments", href: "/dashboard/assignments" },
  { key: "off-market", label: "Off-market", href: "/dashboard/off-market" },
  { key: "buyer-wants", label: "Buyer wants", href: "/dashboard/buyer-mandates" },
];

export function MarketplaceTabs({ active }: { active: "assignments" | "off-market" | "buyer-wants" }) {
  return <SurfaceTabs eyebrow="Marketplace" tabs={MARKETPLACE_TABS} active={active} />;
}

/** Marketing → the pages that send an agent leads: Lead pages · Client hubs. */
export const LEAD_PAGE_TABS: SurfaceTab[] = [
  { key: "lead-pages", label: "Lead pages", href: "/dashboard/lead-pages" },
  { key: "client-hubs", label: "Client hubs", href: "/dashboard/shortlists" },
];

export function LeadPageTabs({ active }: { active: "lead-pages" | "client-hubs" }) {
  return (
    <SurfaceTabs eyebrow="Pages that send you leads" tabs={LEAD_PAGE_TABS} active={active} />
  );
}
