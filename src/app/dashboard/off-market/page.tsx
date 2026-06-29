import type { Metadata } from "next";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { ListingCard } from "@/components/dashboard/off-market/listing-card";
import type { OffMarketListing } from "@/lib/types";

export const metadata: Metadata = { title: "Off-Market" };
export const dynamic = "force-dynamic";

export default async function OffMarketPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
  }>;
}) {
  const { userId, profile } = await requireUserProfile();

  // Approved realtors only — the board is invisible to developers/admins/public
  // (RLS enforces the same; this keeps the page from rendering empty/forbidden).
  if (profile.role !== "realtor" || !isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Off-Market
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const { created, updated, deleted } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("off_market_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);
  const listings = (data as OffMarketListing[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Off-Market
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            A private board for verified agents to share and find off-market
            deals. Post your own, browse others, and reach out directly to
            co-broke. Visible only to verified LIQWD realtors.
          </p>
        </div>
        <ButtonLink href="/dashboard/off-market/new">Post a listing</ButtonLink>
      </div>

      {created ? (
        <Notice tone="success">Your listing is live on the board.</Notice>
      ) : null}
      {updated ? <Notice tone="success">Listing updated.</Notice> : null}
      {deleted ? <Notice tone="success">Listing removed.</Notice> : null}

      {listings.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 py-10 text-center">
            <p className="text-sm text-slate-500">
              No off-market listings yet. Be the first to post one.
            </p>
            <div>
              <ButtonLink href="/dashboard/off-market/new" size="sm">
                Post a listing
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              isOwner={l.realtor_id === userId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
