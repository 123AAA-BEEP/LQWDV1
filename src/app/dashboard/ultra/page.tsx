import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, LineChart, Zap, Compass, Headphones } from "lucide-react";
import { requireUserProfile, isUltra } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { UltraBadge } from "@/components/dashboard/ultra";

export const metadata: Metadata = { title: "Ultra" };
export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: LineChart,
    title: "Market intel",
    body: "Price history, sales velocity, absorption, and comparable projects on every listing.",
  },
  {
    icon: Compass,
    title: "Early & off-market access",
    body: "See select projects and allocations before they reach the general broker pool.",
  },
  {
    icon: Zap,
    title: "Priority updates",
    body: "Be first to know when pricing, incentives, or inventory move on the projects you follow.",
  },
  {
    icon: Headphones,
    title: "Priority support",
    body: "A faster line to the LIQWD team when a deal is on the clock.",
  },
];

// label, free, ultra
const COMPARISON: [string, boolean, boolean][] = [
  ["Browse active projects", true, true],
  ["Broker-only commissions & incentives", true, true],
  ["Submit projects & updates", true, true],
  ["Market intel (price history, velocity)", false, true],
  ["Early & off-market access", false, true],
  ["Priority listing & update alerts", false, true],
  ["Priority support", false, true],
];

export default async function UltraPage() {
  const { profile } = await requireUserProfile();
  const ultra = isUltra(profile);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-amber-400/30 bg-ink p-8 sm:p-10">
        <UltraBadge size="md" />
        <h1 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
          {ultra
            ? "You're on Ultra"
            : "The power layer for serious new-construction agents"}
        </h1>
        <p className="mt-4 max-w-xl text-pretty leading-relaxed text-slate-300">
          {ultra
            ? "Thanks for being an Ultra member. Market intel, early access, and priority updates are unlocked across LIQWD."
            : "Your free plan stays free and fully usable. Ultra adds the intel, access, and speed that turn a busy week into a closed deal."}
        </p>
        {!ultra ? (
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="mailto:hello@liqwd.ca?subject=LIQWD%20Ultra"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/15 px-6 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/25"
            >
              Request Ultra access
            </Link>
            <span className="text-sm text-slate-400">
              Early access — pricing shared on request.
            </span>
          </div>
        ) : null}
      </div>

      {/* Pillars */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title}>
              <CardBody className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-50">
                  <Icon
                    className="size-5 text-amber-600"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <div>
                  <h2 className="font-semibold text-ink">{p.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {p.body}
                  </p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Comparison */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Free vs Ultra
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3 font-medium text-slate-500">
                    What you get
                  </th>
                  <th className="px-5 py-3 text-center font-medium text-slate-500">
                    Free
                  </th>
                  <th className="px-5 py-3 text-center font-semibold text-amber-700">
                    Ultra
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, free, ult]) => (
                  <tr
                    key={label}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-5 py-3 text-slate-700">{label}</td>
                    <td className="px-5 py-3 text-center">
                      <Cell on={free} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Cell on={ult} accent />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Cell({ on, accent }: { on: boolean; accent?: boolean }) {
  if (!on) {
    return (
      <Minus className="mx-auto size-4 text-slate-300" aria-label="Not included" />
    );
  }
  return (
    <Check
      className={`mx-auto size-4 ${accent ? "text-amber-600" : "text-brand-600"}`}
      aria-label="Included"
    />
  );
}
