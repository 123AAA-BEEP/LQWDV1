import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureProfile, isAdmin, isApproved } from "@/lib/auth";
import { Button, ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
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
      <Link href="/" className="mb-8 text-xl font-bold tracking-tight text-ink">
        LIQWD
      </Link>
      {children}
    </main>
  );
}

function InvalidLink() {
  return (
    <Shell>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        This claim link is no longer active
      </h1>
      <p className="mt-2 text-slate-500">
        The link may be incomplete, expired, or the listing may already have been
        claimed. If you think this is a mistake, reply to the email we sent you.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        Already claimed it yourself? It&apos;s safe in your account —{" "}
        <Link
          href="/login?redirect=/dashboard/off-market"
          className="font-medium text-brand-700 hover:underline"
        >
          log in to view it
        </Link>
        .
      </p>
    </Shell>
  );
}

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  if (!TOKEN_RE.test(token)) return <InvalidLink />;

  // Look the listing up by its secret token (RLS would hide a pending row, so
  // use the service-role client — read-only here, just to render the preview).
  // A claimed listing has had its token nulled, so it won't be found here.
  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("off_market_listings")
    .select(
      "id, title, city_region, address, post_kind, listing_status, claimed_by_profile_id",
    )
    .eq("claim_token", token)
    .maybeSingle();

  if (!listing || listing.claimed_by_profile_id) return <InvalidLink />;

  const kindLabel = listing.post_kind
    ? POST_KIND_LABELS[listing.post_kind as OffMarketPostKind]
    : null;
  const statusLabel = listing.listing_status
    ? LISTING_STATUS_LABELS[listing.listing_status as ListingStatus]
    : null;
  const where = [listing.city_region, listing.address].filter(Boolean).join(" · ");

  const preview = (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap gap-1.5">
        {kindLabel ? <Badge tone="brand">{kindLabel}</Badge> : null}
        {statusLabel ? <Badge tone="neutral">{statusLabel}</Badge> : null}
      </div>
      <h2 className="mt-2 text-lg font-semibold text-ink">{listing.title}</h2>
      {where ? <p className="mt-0.5 text-sm text-slate-500">{where}</p> : null}
    </div>
  );

  // Who, if anyone, is signed in? Bootstrap their profile so a just-confirmed
  // agent (no profile row yet) is correctly recognised as a realtor.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user ? await ensureProfile(supabase, user) : null;
  const canClaim =
    !!profile && (profile.role === "realtor" || isAdmin(profile));
  const heldUntilVerified =
    !!profile && profile.role === "realtor" && !isApproved(profile);

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

      {error === "save" ? (
        <Notice tone="error" className="mt-4">
          Something went wrong claiming the listing. Please try again.
        </Notice>
      ) : null}
      {error === "role" ? (
        <Notice tone="warning" className="mt-4">
          Only agent accounts can claim listings. Sign out below and use your
          agent account.
        </Notice>
      ) : null}

      {preview}

      {/* The whole journey, up front — no surprises. */}
      <p className="mt-4 text-center text-xs text-slate-400">
        1. Create your free account &nbsp;·&nbsp; 2. Claim this listing
        &nbsp;·&nbsp; 3. Quick RECO check — then it&apos;s live under your name
      </p>

      {canClaim ? (
        <form action={claimListing} className="mt-6 space-y-2">
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="w-full" pendingLabel="Claiming your listing…">
            This is my listing — claim{heldUntilVerified ? "" : " & publish"}
          </SubmitButton>
          {heldUntilVerified ? (
            <p className="text-center text-xs text-slate-500">
              You&apos;ll claim it now; it goes live once your RECO verification
              is approved.
            </p>
          ) : null}
        </form>
      ) : profile ? (
        <div className="mt-6 space-y-3">
          <Notice tone="warning">
            You&apos;re signed in with an account that can&apos;t claim listings.
            Sign out and open your claim link again with your LIQWD agent
            account.
          </Notice>
          <form action="/auth/signout" method="post">
            <input type="hidden" name="next" value={`/claim/${token}`} />
            <Button type="submit" variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <ButtonLink href={`/signup?next=/claim/${token}`} className="w-full">
            Create my free account &amp; claim — 2 minutes
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
