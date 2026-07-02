import type { Metadata } from "next";
import Link from "next/link";
import { NavButtonLink } from "@/components/ui/nav-button-link";
import { Notice } from "@/components/ui/notice";

export const metadata: Metadata = {
  title: "Listing claimed",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ClaimDonePage({
  searchParams,
}: {
  searchParams: Promise<{ held?: string }>;
}) {
  const { held } = await searchParams;
  const isHeld = held === "1";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-xl font-bold tracking-tight text-ink">
        LIQWD
      </Link>

      <Notice tone="success">✓ Listing claimed — it&apos;s yours.</Notice>

      {isHeld ? (
        <>
          <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
            <p className="text-sm font-semibold text-brand-800">
              Final step — verify you&apos;re a licensed agent
            </p>
            <p className="mt-0.5 text-sm text-brand-700">
              Your listing goes live the moment your RECO verification is
              approved (usually within a day).
            </p>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            One step left: verify to go live
          </h1>
          <p className="mt-2 text-slate-500">
            Your listing is reserved under your name. Submit your RECO number —
            it takes under a minute — and once approved, your listing is live on
            the board and you can browse every other agent&apos;s off-market
            deals.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            You&apos;re all set
          </h1>
          <p className="mt-2 text-slate-500">
            Your listing is now live on the LIQWD off-market board under your
            name. Head to your dashboard to add photos and pricing, and to
            browse other agents&apos; deals.
          </p>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {isHeld ? (
          <NavButtonLink
            href="/dashboard/verify"
            size="lg"
            pendingLabel="Opening verification…"
          >
            Verify now — under a minute
          </NavButtonLink>
        ) : (
          <NavButtonLink
            href="/dashboard/off-market"
            pendingLabel="Opening your dashboard…"
          >
            Go to my dashboard
          </NavButtonLink>
        )}
      </div>
    </main>
  );
}
