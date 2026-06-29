import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
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

/** One off-market listing on the broker board. `isOwner` reveals the Edit link. */
export function ListingCard({
  listing,
  isOwner,
}: {
  listing: OffMarketListing;
  isOwner: boolean;
}) {
  const price = formatOffMarketPrice(listing.price, listing.price_type);
  const size = formatOffMarketSize(listing.size_value, listing.size_type);
  const cover = listing.image_urls[0];
  const extra = listing.image_urls.length - 1;
  const edited = listing.updated_at !== listing.created_at;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No photos
          </div>
        )}
        <span className="absolute left-3 top-3">
          <Badge tone="brand">{LISTING_STATUS_LABELS[listing.listing_status]}</Badge>
        </span>
        {isOwner ? (
          <span className="absolute right-3 top-3">
            <Badge tone="neutral">Your listing</Badge>
          </span>
        ) : null}
        {extra > 0 ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">
            +{extra} photo{extra === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      <CardBody className="flex flex-1 flex-col gap-3">
        <div>
          <h3 className="font-semibold text-ink">{listing.title}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            {listing.city_region}
            {listing.address ? ` · ${listing.address}` : ""}
          </p>
        </div>

        <p className="text-lg font-semibold text-slate-800">
          {price}
          {size ? (
            <span className="ml-2 text-sm font-normal text-slate-500">{size}</span>
          ) : null}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {listing.property_types.map((pt) => (
            <Badge key={pt} tone="neutral">
              {PROPERTY_TYPE_LABELS[pt]}
            </Badge>
          ))}
        </div>

        {listing.property_type_description ? (
          <p className="text-sm leading-relaxed text-slate-600">
            {listing.property_type_description}
          </p>
        ) : null}

        {/* Contact — the point of the board: connect agent to agent. */}
        <div className="mt-auto rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-sm">
          <p className="font-medium text-slate-800">{listing.realtor_name}</p>
          <p className="text-xs text-slate-500">
            {[listing.realtor_title, listing.brokerage_name]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a
              href={`tel:${listing.contact_phone}`}
              className="text-brand-700 hover:underline"
            >
              {listing.contact_phone}
            </a>
            <a
              href={`mailto:${listing.contact_email}`}
              className="break-all text-brand-700 hover:underline"
            >
              {listing.contact_email}
            </a>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Posted {fmtDate(listing.created_at)}
            {edited ? ` · Updated ${fmtDate(listing.updated_at)}` : ""}
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
