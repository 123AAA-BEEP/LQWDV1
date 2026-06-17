import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Infinity as InfinityIcon, Ticket } from "lucide-react";
import { requireUserProfile, isDeveloper, isAdmin } from "@/lib/auth";
import {
  isDeveloperSubConfigured,
  isConnectCreditsConfigured,
  developerPriceLabel,
  connectCreditsLabel,
  connectCreditsPerPack,
} from "@/lib/stripe";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  startDeveloperSubscription,
  buyConnectCredits,
  manageDeveloperBilling,
} from "./actions";

export const metadata: Metadata = { title: "Developer access" };
export const dynamic = "force-dynamic";

export default async function DeveloperAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { profile } = await requireUserProfile();
  const { status } = await searchParams;

  if (!isDeveloper(profile) && !isAdmin(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Developer access
        </h1>
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            This area is for developer accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  const hasSub = profile.developer_mandate_access;
  const credits = profile.mandate_connect_credits;
  const subOn = isDeveloperSubConfigured();
  const creditsOn = isConnectCreditsConfigured();
  const billingLive = subOn || creditsOn;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Developer access
        </h1>
        <p className="mt-1 text-slate-500">
          Browsing buyer mandates is free. Requesting an intro (a “connect”)
          uses your access.
        </p>
      </div>

      {status === "subscribed" ? (
        <Notice tone="success">You&apos;re subscribed — unlimited connects unlocked.</Notice>
      ) : null}
      {status === "credits" ? (
        <Notice tone="success">Connect credits added to your balance.</Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <InfinityIcon className="size-5 text-brand-600" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Subscription</p>
                <p className="text-sm text-slate-500">
                  {hasSub ? "Active — unlimited connects" : "Not active"}
                  {developerPriceLabel && !hasSub ? ` · ${developerPriceLabel}` : ""}
                </p>
              </div>
            </div>
            {hasSub ? (
              <form action={manageDeveloperBilling}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Manage billing
                </button>
              </form>
            ) : subOn ? (
              <form action={startDeveloperSubscription}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Subscribe
                </button>
              </form>
            ) : (
              <span className="text-sm text-slate-400">Coming soon</span>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50">
                <Ticket className="size-5 text-brand-600" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <p className="text-2xl font-semibold tabular-nums text-ink">{credits}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Connect credits
                </p>
              </div>
            </div>
            {creditsOn ? (
              <form action={buyConnectCredits}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Buy {connectCreditsPerPack} credits
                  {connectCreditsLabel ? ` · ${connectCreditsLabel}` : ""}
                </button>
              </form>
            ) : (
              <span className="text-sm text-slate-400">Coming soon</span>
            )}
          </CardBody>
        </Card>
      </div>

      {!billingLive ? (
        <Card>
          <CardBody className="text-center">
            <ClipboardCheck className="mx-auto size-8 text-slate-300" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-3 text-lg font-semibold text-ink">
              Self-serve billing is launching soon
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              A developer subscription (unlimited connects) and à-la-carte
              connect credit packs are on the way. In the meantime, get in touch
              and we&apos;ll set you up.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="mailto:hello@liqwd.ca?subject=LIQWD%20developer%20access"
                className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Contact us
              </Link>
              <ButtonLink href="/dashboard/buyer-mandates" variant="secondary" size="sm">
                Browse mandates
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">
          A subscription gives unlimited connects; credits are a pay-as-you-go
          alternative. Each connect request uses one credit unless you&apos;re
          subscribed.
        </p>
      )}
    </div>
  );
}

