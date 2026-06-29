import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import {
  POST_KIND_LABELS,
  LISTING_STATUS_LABELS,
  type OffMarketPostKind,
  type ListingStatus,
} from "@/lib/types";
import { claimListing } from "./actions";

export const metadata: Metadata = {
  title: "Claim your listing",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 text-xl font-bold tracking-tight text-ink"
      >
        LIQWD
      </Link>
      {children}
    </main>
  );
}

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { token } = await params;
  const { done, error } = await searchParams;

  if (!TOKEN_RE.test(token)) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          This claim link isn&apos;t valid
        </h1>
        <p className="mt-2 text-slate-500">
          The link may be incomplete or expired. Please use the most recent link
          we sent you.
        </p>
      </Shell>
    );
  }

  // Look the listing up by its secret token (RLS would hide a pending row, so
  // use the service-role client — read-only here, just to render the preview).
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("off_market_listings")
    .select("id, title, city_region, address, post_kind, listing_status, status")
    .eq("claim_token", token)
    .maybeSingle();

  if (!listing) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          This claim link isn&apos;t valid
        </h1>
        <p className="mt-2 text-slate-500">
          We couldn&apos;t find a listing for this link. Please use the most
          recent link we sent you.
        </p>
      </Shell>
    );
  }

  const kindLabel = listing.post_kind
    ? POST_KIND_LABELS[listing.post_kind as OffMarketPostKind]
    : null;
  const statusLabel = listing.listing_status
    ? LISTING_STATUS_LABELS[listing.listing_status as ListingStatus]
    : null;
  const where = [listing.city_region, listing.address].filter(Boolean).join(" · ");

  const preview = (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap gap-1.5 text-xs">
        {kindLabel ? (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
            {kindLabel}
          </span>
        ) : null}
        {statusLabel ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
            {statusLabel}
          </span>
        ) : null}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-ink">{listing.title}</h2>
      {where ? <p className="mt-0.5 text-sm text-slate-500">{where}</p> : null}
    </div>
  );

  // Success state.
  if (done) {
    return (
      <Shell>
        <Notice tone="success">Listing claimed.</Notice>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
          You&apos;re all set
        </h1>
        <p className="mt-2 text-slate-500">
          This listing is now live on the LIQWD off-market board under your name.
          Finish your account setup to manage it, add photos and pricing, and
          browse other agents&apos; deals.
        </p>
        {preview}
        <div className="mt-6">
          <ButtonLink href="/dashboard/off-market">Go to my dashboard</ButtonLink>
        </div>
      </Shell>
    );
  }

  // Already claimed (by someone) — don't let it be re-claimed.
  if (listing.status !== "pending_claim") {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          This listing has already been claimed
        </h1>
        <p className="mt-2 text-slate-500">
          If you believe this is a mistake, reply to the email we sent you and
          we&apos;ll sort it out.
        </p>
        {preview}
      </Shell>
    );
  }

  // Is anyone signed in?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = (profile?.role as string | null) ?? null;
  }
  const canClaim = role === "realtor" || role === "admin";

  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Claim your listing on LIQWD
      </h1>
      <p className="mt-2 text-slate-500">
        We&apos;ve added this listing to LIQWD&apos;s private off-market board for
        verified agents. Claim it free to make it live under your name and
        connect with co-broking agents.
      </p>

      {error === "role" ? (
        <Notice tone="warning" className="mt-4">
          You&apos;re signed in with an account that can&apos;t claim listings.
          Sign in with your agent account to continue.
        </Notice>
      ) : null}
      {error === "save" ? (
        <Notice tone="error" className="mt-4">
          Something went wrong claiming the listing. Please try again.
        </Notice>
      ) : null}

      {preview}

      {user && canClaim ? (
        <form action={claimListing} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <Button type="submit" className="w-full">
            This is my listing — claim &amp; publish
          </Button>
        </form>
      ) : user && !canClaim ? (
        <Notice tone="warning" className="mt-6">
          Sign in with your LIQWD agent account to claim this listing.
        </Notice>
      ) : (
        <div className="mt-6 space-y-3">
          <ButtonLink href={`/signup?next=/claim/${token}`} className="w-full">
            Verify &amp; create my free account
          </ButtonLink>
          <p className="text-center text-sm text-slate-500">
            Already on LIQWD?{" "}
            <Link
              href={`/login?redirect=/claim/${token}`}
              className="font-medium text-brand-700 hover:underline"
            >
              Log in to claim
            </Link>
          </p>
        </div>
      )}

      <p className="mt-8 text-xs text-slate-400">
        You received this because your listing was added to LIQWD&apos;s agent
        network. Don&apos;t want it here? Reply to our email and we&apos;ll remove
        it.
      </p>
    </Shell>
  );
}
