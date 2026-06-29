import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
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

      <Notice tone="success">Listing claimed.</Notice>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        You&apos;re all set
      </h1>

      {isHeld ? (
        <p className="mt-2 text-slate-500">
          Your listing is reserved under your name. It goes live on the LIQWD
          off-market board as soon as your RECO verification is approved —
          usually within a day. Finish your verification to speed it up and to
          start browsing other agents&apos; deals.
        </p>
      ) : (
        <p className="mt-2 text-slate-500">
          Your listing is now live on the LIQWD off-market board under your name.
          Head to your dashboard to add photos and pricing, and to browse other
          agents&apos; deals.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {isHeld ? (
          <ButtonLink href="/dashboard/verify">Finish verification</ButtonLink>
        ) : (
          <ButtonLink href="/dashboard/off-market">Go to my dashboard</ButtonLink>
        )}
      </div>
    </main>
  );
}
