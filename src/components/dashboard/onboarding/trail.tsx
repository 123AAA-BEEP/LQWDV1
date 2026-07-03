import Link from "next/link";
import { Rocket, Magnet, BookOpen, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The onboarding journey strip — renders atop each onboarding surface so
 * "Get started", "Get free leads", and the Playbook read as one three-step
 * path instead of three unrelated pages.
 */
const STEPS: {
  key: TrailStep;
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "start", href: "/dashboard/start", label: "Get started", icon: Rocket },
  {
    key: "leads",
    href: "/dashboard/get-free-leads",
    label: "Get free leads",
    icon: Magnet,
  },
  { key: "playbook", href: "/dashboard/learn", label: "Playbook", icon: BookOpen },
];

export type TrailStep = "start" | "leads" | "playbook";

export function OnboardingTrail({ current }: { current: TrailStep }) {
  return (
    <nav aria-label="Onboarding steps" className="flex flex-wrap items-center gap-1.5">
      {STEPS.map((s, i) => {
        const active = s.key === current;
        return (
          <span key={s.key} className="flex items-center gap-1.5">
            <Link
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                active
                  ? "border-brand-200 bg-brand-50 text-brand-800"
                  : "border-slate-200 text-slate-500 hover:border-brand-200 hover:text-brand-700",
              )}
            >
              <s.icon className="size-3.5" strokeWidth={1.75} aria-hidden />
              {i + 1}. {s.label}
            </Link>
            {i < STEPS.length - 1 ? (
              <span aria-hidden className="text-slate-300">
                →
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
