import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

/** One off-market listing on the broker board. Handles both native realtor posts
 *  and seeded (ICIWorld) unclaimed posts, which may have no price/type/contact. */
export function ListingCard({
  listing,
  isOwner,
}: {
  listing: OffMarketListing;
  isOwner: boolean;
}) {
  const price =
    listing.price != null && listing.price_type
      ? formatOffMarketPrice(listing.price, listing.price_type)
      : null;
  const size = formatOffMarketSize(listing.size_value, listing.size_type);
  const cover = listing.image_urls?.[0];
  const extra = (listing.image_urls?.length ?? 0) - 1;
  const edited = listing.updated_at !== listing.created_at;

  const seeded = listing.source === "iciworld";
  const unclaimed = seeded && !listing.claimed_by_profile_id;
  const hasContact = Boolean(listing.realtor_name);

  return (
    <Card className="flex h-full flex-col overflow-hidden">
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
          {seeded ? <Badge tone="neutral">via ICIWorld</Badge> : null}
          {unclaimed ? <Badge tone="warning">Unclaimed</Badge> : null}
          {isOwner ? <Badge tone="neutral">Your listing</Badge> : null}
        </div>

        <div>
          <h3 className="font-semibold leading-snug text-ink">{listing.title}</h3>
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
          <p className="text-sm leading-relaxed text-slate-600">
            {listing.property_type_description}
          </p>
        ) : null}

        {/* Contact (native posts) or a claim prompt (seeded/unclaimed). */}
        <div className="mt-auto rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-sm">
          {hasContact ? (
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
          ) : unclaimed ? (
            <p className="text-xs text-slate-500">
              Sourced from ICIWorld — unclaimed. The listing agent can claim it by
              signing up and verifying.
            </p>
          ) : (
            <p className="text-xs text-slate-400">No contact provided.</p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {seeded ? "Imported" : "Posted"} {fmtDate(listing.created_at)}
            {edited && !seeded ? ` · Updated ${fmtDate(listing.updated_at)}` : ""}
          </span>
          {isOwner ? (
            <Link
              href={`/dashboard/off-market/${listing.id}/edit`}
              className="font-medium text-brand-700 hover:underline"
            >
              Edit
            </Link>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
