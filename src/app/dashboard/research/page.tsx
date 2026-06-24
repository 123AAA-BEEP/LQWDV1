import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, TrendingUp, type LucideIcon } from "lucide-react";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { SECTION_ACCENT } from "@/lib/section-accents";

export const metadata: Metadata = { title: "Research" };
export const dynamic = "force-dynamic";

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BarChart3,
    title: "Project analytics",
    body: "Views, saves, leads, and which agents engaged — the full funnel for every project.",
  },
  {
    icon: TrendingUp,
    title: "Buyer demand signals",
    body: "See where verified buyer demand is concentrated by city, price, and unit type.",
  },
];

export default async function ResearchPage() {
  const { profile } = await requireUserProfile();
  if (!isDeveloper(profile)) redirect("/dashboard");
  const a = SECTION_ACCENT.sky;

  return (
    <div className="space-y-6">
      <div className={cn("rounded-2xl p-6 ring-1 ring-inset sm:p-8", a.zone)}>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
            a.chip,
          )}
        >
          <BarChart3 className="size-3" strokeWidth={2} aria-hidden /> Research
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          See demand and performance before you decide
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Market and project insights to guide where and how you sell or lease.
          These are launching soon — we&rsquo;ll let you know when they&rsquo;re
          ready.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="border-dashed bg-slate-50/60">
              <CardBody className="flex h-full flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
                    <Icon className="size-5 text-slate-400" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-3 font-semibold text-slate-600">{f.title}</h3>
                <p className="mt-1 flex-1 text-sm text-slate-400">{f.body}</p>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
