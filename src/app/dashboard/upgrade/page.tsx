import type { Metadata } from "next";
import {
  Check,
  Minus,
  BadgeCheck,
  Globe,
  ClipboardCheck,
  Phone,
  Mail,
  Sparkles,
  ShieldCheck,
  Zap,
  MapPin,
} from "lucide-react";
import { requireUserProfile, isPro } from "@/lib/auth";
import { isStripeConfigured, proPriceLabel } from "@/lib/stripe";
import { Card, CardBody } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { TITLE_LABELS } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { startCheckout, manageBilling } from "./actions";

export const metadata: Metadata = { title: "Upgrade to Pro" };
export const dynamic = "force-dynamic";

// What Pro adds vs Free. (Pro is tooling; it does NOT grant Ultra/Deal Desk.)
const COMPARISON: [string, boolean, boolean][] = [
  ["Browse active projects", true, true],
  ["Broker-only commissions & incentives", true, true],
  ["Submit projects & proposals", true, true],
  ["Branded public agent profile", false, true],
  ["Free project landing pages (up to 10)", false, true],
  ["Inbound buyer leads routed to you", false, true],
  ["Buyer Mandate — verified buyer matching", false, true],
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
    <div className="space-y-12">
      {upgraded && pro ? (
        <Notice tone="success">
          You&apos;re on Pro — your branded profile, landing pages, and Buyer
          Mandate are unlocked. Thanks for the support!
        </Notice>
      ) : null}

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 sm:p-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
          <Zap className="size-3" strokeWidth={2} aria-hidden /> Pro
        </span>
        <h1 className="mt-4 max-w-2xl text-balance text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          {pro ? "You're on LIQWD Pro" : "Turn LIQWD into your lead engine"}
        </h1>
        <p className="mt-4 max-w-xl text-pretty leading-relaxed text-slate-600">
          {pro
            ? "Your branded profile, landing pages, and Buyer Mandate are unlocked. Manage your subscription anytime."
            : "Your free plan stays free. Pro puts your brand in front of buyers, gives you free project landing pages, and matches hard-to-place buyers to inventory automatically."}
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

      {/* Branded profile spotlight — copy + visual mockup */}
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            <span aria-hidden className="h-px w-8 bg-brand-500" />
            Branded public profile
          </p>
          <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Your brand on every page — and the leads that come with it
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-slate-600">
            Pro puts your photo, brokerage, and contact details on a polished
            public profile and on the project pages you power. When a buyer
            reaches out, the lead is routed straight to you — at no extra cost.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              {
                icon: Mail,
                t: "Free inbound leads",
                d: "Buyer enquiries from your pages come straight to your inbox.",
              },
              {
                icon: Globe,
                t: "Up to 10 free project landing pages",
                d: "Host your own SEO-friendly landing pages — each a lead magnet pointing back to you.",
              },
              {
                icon: BadgeCheck,
                t: "A profile buyers trust",
                d: "Verified realtor badge, brokerage, and a clean, professional look.",
              },
            ].map((f) => (
              <li key={f.t} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <f.icon className="size-4 text-brand-600" strokeWidth={1.75} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{f.t}</span>
                  <span className="block text-sm text-slate-500">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <BrandedProfilePreview profile={profile} />
      </div>

      {/* Buyer Mandate */}
      <Card>
        <CardBody className="sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                <span aria-hidden className="h-px w-8 bg-brand-500" />
                Buyer Mandate
              </p>
              <h2 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-ink">
                Stop searching. Let the right inventory find your buyer.
              </h2>
              <p className="mt-4 text-pretty leading-relaxed text-slate-600">
                Create a mandate for a hard-to-match buyer — location, size,
                budget, type, timeline, must-haves. Matching inventory and
                off-market listings surface to you automatically, instead of
                manual searching.
              </p>
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
              <ClipboardCheck className="size-6 text-brand-600" strokeWidth={1.75} aria-hidden />
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: MapPin,
                t: "Specify the buyer",
                d: "Area & radius, size, beds/baths, price band, type, condition, timeline.",
              },
              {
                icon: ShieldCheck,
                t: "Verify for priority",
                d: "Add pre-approval, proof of funds, and a signed rep agreement for a Verified badge.",
              },
              {
                icon: Sparkles,
                t: "Get matched",
                d: "Verified mandates rank higher and are what listing-side brokers can be pitched against.",
              },
            ].map((s) => (
              <div key={s.t} className="rounded-lg border border-slate-200 p-4">
                <s.icon className="size-5 text-brand-600" strokeWidth={1.75} aria-hidden />
                <p className="mt-2 text-sm font-semibold text-ink">{s.t}</p>
                <p className="mt-1 text-sm text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50/70 px-4 py-3 text-sm text-slate-600">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <span>
              <span className="font-medium text-ink">Verification is the differentiator.</span>{" "}
              A mandate backed by pre-approval, funds, and a signed rep agreement
              filters out tire-kickers — and protects your time.
            </span>
          </p>
        </CardBody>
      </Card>

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

/** Static, personalized mockup of how the agent's branded public profile looks. */
function BrandedProfilePreview({ profile }: { profile: Profile }) {
  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Your name";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "YN";
  const title = profile.title ? TITLE_LABELS[profile.title] : "Sales Representative";
  const brokerage = profile.brokerage_name ?? "Your Brokerage";
  const slug =
    name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "") || "your-name";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="size-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 truncate rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-400 ring-1 ring-slate-200">
          liqwd.ca/agent/{slug}
        </span>
      </div>
      {/* Banner + avatar */}
      <div className="h-16 bg-gradient-to-r from-brand-600 to-brand-400" />
      <div className="px-5 pb-5">
        <div className="-mt-8 flex items-end justify-between">
          <span className="flex size-16 items-center justify-center rounded-full border-4 border-white bg-brand-100 text-lg font-semibold text-brand-800">
            {initials}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
            <BadgeCheck className="size-3.5" aria-hidden /> Verified
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-ink">{name}</h3>
        <p className="text-sm text-slate-500">
          {title} · {brokerage}
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white">
            <Phone className="size-3.5" aria-hidden /> Call
          </span>
          <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">
            <Mail className="size-3.5" aria-hidden /> Email
          </span>
        </div>
        {/* Featured project pages */}
        <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Featured projects
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-slate-200">
              <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200" />
              <div className="space-y-1 p-1.5">
                <div className="h-1.5 w-3/4 rounded bg-slate-200" />
                <div className="h-1.5 w-1/2 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
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
