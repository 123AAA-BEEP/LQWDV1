import type { Metadata } from "next";
import {
  Check,
  Minus,
  Bell,
  LineChart,
  BadgeCheck,
  Bookmark,
  Zap,
  Sparkles,
} from "lucide-react";
import { requireUserProfile, isPro } from "@/lib/auth";
import { isStripeConfigured, proPriceLabel } from "@/lib/stripe";
import { Card, CardBody } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { startCheckout, manageBilling } from "./actions";

export const metadata: Metadata = { title: "Upgrade to Pro" };
export const dynamic = "force-dynamic";

const PILLARS = [
  {
    icon: Bell,
    title: "Priority alerts",
    body: "Be first to know when pricing, incentives, or inventory move on the projects you follow.",
  },
  {
    icon: LineChart,
    title: "Project insights",
    body: "Pricing context and trends to help you advise clients with confidence.",
  },
  {
    icon: Bookmark,
    title: "Saved searches",
    body: "Save your filters and jump straight to the inventory that matters to you.",
  },
  {
    icon: BadgeCheck,
    title: "Branded public profile",
    body: "A polished public profile that turns project pages into your leads.",
  },
];

const COMPARISON: [string, boolean, boolean][] = [
  ["Browse active projects", true, true],
  ["Broker-only commissions & incentives", true, true],
  ["Submit projects & proposals", true, true],
  ["Priority pricing & inventory alerts", false, true],
  ["Project insights & trends", false, true],
  ["Saved searches", false, true],
  ["Branded public profile", false, true],
];

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string }>;
}) {
  const { profile } = await requireUserProfile();
  const pro = isPro(profile);
  const stripeOn = isStripeConfigured();
  const { upgraded } = await searchParams;

  return (
    <div className="space-y-10">
      {upgraded && pro ? (
        <Notice tone="success">
          You&apos;re on Pro — your premium tooling is unlocked. Thanks for the
          support!
        </Notice>
      ) : null}

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
          <Zap className="size-3" strokeWidth={2} aria-hidden /> Pro
        </span>
        <h1 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          {pro ? "You're on LIQWD Pro" : "Do more with LIQWD Pro"}
        </h1>
        <p className="mt-4 max-w-xl text-pretty leading-relaxed text-slate-600">
          {pro
            ? "Your premium tooling is unlocked. Manage your subscription anytime."
            : "Your free plan stays free. Pro adds the tooling that helps you move faster and look sharper with clients."}
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          {pro ? (
            profile.stripe_customer_id ? (
              <form action={manageBilling}>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
                >
                  Manage billing
                </button>
              </form>
            ) : null
          ) : stripeOn ? (
            <>
              <form action={startCheckout}>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  <Zap className="size-4" strokeWidth={2} aria-hidden />
                  Upgrade to Pro
                </button>
              </form>
              <span className="text-sm text-slate-500">
                {proPriceLabel ? `${proPriceLabel} · cancel anytime` : "Cancel anytime."}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-500">
              Pro is launching soon — check back shortly.
            </span>
          )}
        </div>
      </div>

      {/* Pillars */}
      <div className="grid gap-4 sm:grid-cols-2">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <Card key={p.title}>
              <CardBody className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Icon className="size-5 text-brand-600" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold text-ink">{p.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{p.body}</p>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {/* Comparison */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Free vs Pro
        </h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-5 py-3 font-medium text-slate-500">What you get</th>
                  <th className="px-5 py-3 text-center font-medium text-slate-500">Free</th>
                  <th className="px-5 py-3 text-center font-semibold text-brand-700">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([label, free, proCol]) => (
                  <tr key={label} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 text-slate-700">{label}</td>
                    <td className="px-5 py-3 text-center">
                      <Cell on={free} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Cell on={proCol} accent />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Ultra clarifier — Pro is not Deal Desk. */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
        <p className="text-sm text-slate-600">
          <span className="font-medium text-ink">Looking for the Deal Desk?</span>{" "}
          Developer deal requests are part of{" "}
          <span className="font-medium">Ultra</span>, our invitation-only tier for
          vetted agents — separate from Pro, and not something you can buy. Pro
          members in good standing are first in line to be considered.
        </p>
      </div>
    </div>
  );
}

function Cell({ on, accent }: { on: boolean; accent?: boolean }) {
  if (!on) {
    return <Minus className="mx-auto size-4 text-slate-300" aria-label="Not included" />;
  }
  return (
    <Check
      className={`mx-auto size-4 ${accent ? "text-brand-600" : "text-slate-500"}`}
      aria-label="Included"
    />
  );
}
