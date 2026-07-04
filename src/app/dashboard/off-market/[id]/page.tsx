import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { VerificationRequired } from "@/components/dashboard/locked";
import { CopyClaimLink } from "@/components/dashboard/off-market/copy-claim-link";
import { claimUrlFor } from "@/lib/off-market";
import { signListingImages } from "@/lib/off-market-media";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  POST_KIND_LABELS,
  formatOffMarketPrice,
  formatOffMarketSize,
  type OffMarketListing,
} from "@/lib/types";

export const metadata: Metadata = { title: "Off-market listing" };
export const dynamic = "force-dynamic";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function OffMarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId, profile } = await requireUserProfile();

  const canView =
    isAdmin(profile) || (profile.role === "realtor" && isApproved(profile));
  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Off-market listing
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const { id } = await params;
  const supabase = await createClient();
  // Explicit, provenance-free column list (never select source/source_ref/
  // claim_email into a render tree). RLS still gates which rows are visible.
  const { data } = await supabase
    .from("off_market_listings")
    .select(
      "id, realtor_id, title, price, price_type, listing_status, property_types, city_region, address, property_type_description, size_value, size_type, image_urls, realtor_name, realtor_title, brokerage_name, contact_phone, contact_email, created_at, updated_at, post_kind, status, claim_token, claimed_by_profile_id",
    )
    .eq("id", id)
    .maybeSingle();
  const listing = data as OffMarketListing | null;
  if (!listing) notFound();

  const isOwner = listing.realtor_id === userId;
  const admin = isAdmin(profile);
  const canEdit = isOwner || admin;
  const pending = listing.status === "pending_claim";

  const price =
    listing.price != null && listing.price_type
      ? formatOffMarketPrice(listing.price, listing.price_type)
      : null;
  const size = formatOffMarketSize(listing.size_value, listing.size_type);
  // Private bucket (0060): stored paths become short-lived signed URLs.
  const [signedListing] = await signListingImages([listing]);
  const photos = signedListing.image_urls ?? [];
  const hasContact = Boolean(listing.realtor_name);
  const claimable = !listing.claimed_by_profile_id && !hasContact;
  const edited = listing.updated_at !== listing.created_at;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          href="/dashboard/off-market"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to the board
        </Link>
        {canEdit ? (
          <ButtonLink
            href={`/dashboard/off-market/${listing.id}/edit`}
            variant="secondary"
            size="sm"
          >
            Edit listing
          </ButtonLink>
        ) : null}
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {listing.post_kind ? (
            <Badge tone={listing.post_kind === "want" ? "warning" : "brand"}>
              {POST_KIND_LABELS[listing.post_kind]}
            </Badge>
          ) : null}
          {listing.listing_status ? (
            <Badge tone="neutral">
              {LISTING_STATUS_LABELS[listing.listing_status]}
            </Badge>
          ) : null}
          {isOwner ? <Badge tone="neutral">Your listing</Badge> : null}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {listing.title}
        </h1>
        {listing.city_region || listing.address ? (
          <p className="text-slate-500">
            {[listing.city_region, listing.address].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {price || size ? (
          <p className="text-xl font-semibold text-slate-800">
            {price ?? ""}
            {size ? (
              <span
                className={price ? "ml-2 text-base font-normal text-slate-500" : ""}
              >
                {size}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {/* Admin: this listing is still dark — send the agent its claim link. */}
      {admin && pending && listing.claim_token ? (
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge tone="warning">Pending claim</Badge>
              <p className="text-sm text-slate-500">
                Hidden from the network until the listing agent claims it.
              </p>
            </div>
            <p className="text-sm font-medium text-slate-800">
              Send the listing agent their claim link:
            </p>
            <CopyClaimLink url={claimUrlFor(listing.claim_token)} />
          </CardBody>
        </Card>
      ) : null}

      {/* Photos */}
      {photos.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {photos.map((url, i) => (
            <div
              key={url}
              className={`overflow-hidden rounded-xl bg-slate-100 ${
                i === 0 ? "sm:col-span-2 aspect-[16/9]" : "aspect-[4/3]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${listing.title} — photo ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details */}
        <div className="space-y-5 lg:col-span-2">
          {listing.property_types?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {listing.property_types.map((pt) => (
                <Badge key={pt} tone="neutral">
                  {PROPERTY_TYPE_LABELS[pt]}
                </Badge>
              ))}
            </div>
          ) : null}

          {listing.property_type_description ? (
            <Card>
              <CardBody>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {listing.property_type_description}
                </p>
              </CardBody>
            </Card>
          ) : null}

          <p className="text-xs text-slate-400">
            Listed {fmtDate(listing.created_at)}
            {edited ? ` · Updated ${fmtDate(listing.updated_at)}` : ""}
          </p>
        </div>

        {/* Contact / claim */}
        <div className="lg:col-span-1">
          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">
                Listing agent
              </h2>
              {hasContact ? (
                <>
                  <div>
                    <p className="font-medium text-slate-800">
                      {listing.realtor_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[listing.realtor_title, listing.brokerage_name]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 text-sm">
                    {listing.contact_phone ? (
                      <a
                        href={`tel:${listing.contact_phone}`}
                        className="text-brand-700 hover:underline"
                      >
                        {listing.contact_phone}
                      </a>
                    ) : null}
                    {listing.contact_email ? (
                      <a
                        href={`mailto:${listing.contact_email}`}
                        className="break-all text-brand-700 hover:underline"
                      >
                        {listing.contact_email}
                      </a>
                    ) : null}
                  </div>
                </>
              ) : claimable ? (
                <p className="text-sm text-slate-500">
                  Contact details for this listing aren&apos;t posted yet. Are you
                  the listing agent? Claim this listing to add your contact info
                  and connect with co-broking agents.
                </p>
              ) : (
                <p className="text-sm text-slate-400">No contact provided.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
