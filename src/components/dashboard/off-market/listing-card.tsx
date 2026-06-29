import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyClaimLink } from "@/components/dashboard/off-market/copy-claim-link";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  POST_KIND_LABELS,
  formatOffMarketPrice,
  formatOffMarketSize,
  type OffMarketListing,
} from "@/lib/types";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** One off-market listing on the broker board. Handles both fully-detailed
 *  posts and lighter ones that may have no price/type/contact yet. The whole
 *  card links through to the listing detail page. */
export function ListingCard({
  listing,
  isOwner,
  canEdit = isOwner,
  claimUrl = null,
}: {
  listing: OffMarketListing;
  isOwner: boolean;
  canEdit?: boolean;
  /** Admin "pending claims" view: the link to send the listing agent. */
  claimUrl?: string | null;
}) {
  const href = `/dashboard/off-market/${listing.id}`;
  const price =
    listing.price != null && listing.price_type
      ? formatOffMarketPrice(listing.price, listing.price_type)
      : null;
  const size = formatOffMarketSize(listing.size_value, listing.size_type);
  const cover = listing.image_urls?.[0];
  const extra = (listing.image_urls?.length ?? 0) - 1;
  const edited = listing.updated_at !== listing.created_at;
  const hasContact = Boolean(listing.realtor_name);
  const claimable = !listing.claimed_by_profile_id && !hasContact;

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={href} className="block">
        {cover ? (
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
            {extra > 0 ? (
              <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">
                +{extra} photo{extra === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        ) : null}
      </Link>

      <CardBody className="flex flex-1 flex-col gap-3">
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
          {claimUrl ? <Badge tone="warning">Pending claim</Badge> : null}
          {isOwner ? <Badge tone="neutral">Your listing</Badge> : null}
        </div>

        <div>
          <h3 className="font-semibold leading-snug text-ink">
            <Link href={href} className="hover:underline">
              {listing.title}
            </Link>
          </h3>
          {listing.city_region || listing.address ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {[listing.city_region, listing.address].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>

        {price || size ? (
          <p className="text-lg font-semibold text-slate-800">
            {price ?? ""}
            {size ? (
              <span className={price ? "ml-2 text-sm font-normal text-slate-500" : "text-base"}>
                {size}
              </span>
            ) : null}
          </p>
        ) : null}

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
          <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
            {listing.property_type_description}
          </p>
        ) : null}

        {/* Admin pending view: the claim link to send the listing agent.
            Otherwise contact info, or a claim prompt when none is posted. */}
        <div className="mt-auto rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-sm">
          {claimUrl ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">
                Send this link to the listing agent to claim &amp; publish:
              </p>
              <CopyClaimLink url={claimUrl} />
            </div>
          ) : hasContact ? (
            <>
              <p className="font-medium text-slate-800">{listing.realtor_name}</p>
              <p className="text-xs text-slate-500">
                {[listing.realtor_title, listing.brokerage_name]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
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
            <p className="text-xs text-slate-500">
              Are you the listing agent? Claim this listing to add your contact
              details.
            </p>
          ) : (
            <p className="text-xs text-slate-400">No contact provided.</p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Listed {fmtDate(listing.created_at)}
            {edited ? ` · Updated ${fmtDate(listing.updated_at)}` : ""}
          </span>
          <div className="flex items-center gap-3">
            <Link href={href} className="font-medium text-brand-700 hover:underline">
              View details
            </Link>
            {canEdit ? (
              <Link
                href={`${href}/edit`}
                className="font-medium text-brand-700 hover:underline"
              >
                Edit
              </Link>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
