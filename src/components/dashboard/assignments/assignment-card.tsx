import Link from "next/link";
import { MapPin, Pencil, BadgeCheck, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BUILDER_CONSENT_LABELS,
  ASSIGNMENT_STATUS_LABELS,
  type AssignmentListing,
} from "@/lib/types";

function money(n: number | null): string | null {
  if (n === null) return null;
  return n.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function AssignmentCard({
  listing,
  canEdit,
}: {
  listing: AssignmentListing;
  canEdit: boolean;
}) {
  const specs = [
    listing.beds != null ? `${listing.beds} bed` : null,
    listing.baths != null ? `${listing.baths} bath` : null,
    listing.size_sqft != null ? `${listing.size_sqft} sq ft` : null,
    listing.exposure,
  ].filter(Boolean);

  const prohibited = listing.builder_consent_status === "assignment_prohibited";
  const consentTone: "success" | "danger" | "neutral" =
    listing.builder_consent_status === "consent_obtained"
      ? "success"
      : prohibited
        ? "danger"
        : "neutral";

  return (
    <Card className="flex h-full flex-col">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {listing.status !== "active" ? (
              <Badge tone="neutral" className="capitalize">
                {ASSIGNMENT_STATUS_LABELS[listing.status]}
              </Badge>
            ) : null}
            <Badge tone={consentTone}>
              {consentTone === "success" ? (
                <BadgeCheck aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
              ) : prohibited ? (
                <AlertTriangle aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
              ) : null}
              {BUILDER_CONSENT_LABELS[listing.builder_consent_status]}
            </Badge>
          </div>
          {canEdit ? (
            <Link
              href={`/dashboard/assignments/${listing.id}/edit`}
              className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Edit"
            >
              <Pencil aria-hidden className="size-4" />
            </Link>
          ) : null}
        </div>

        <h3 className="mt-2 font-semibold text-ink">
          {listing.project_name}
          {listing.unit_label ? (
            <span className="text-slate-400"> · {listing.unit_label}</span>
          ) : null}
        </h3>
        <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-500">
          <MapPin aria-hidden className="size-3.5" /> {listing.city_region}
        </p>

        <p className="mt-3 text-lg font-semibold text-ink">
          {money(listing.assignment_price)}
          <span className="ml-1 text-xs font-normal text-slate-400">assignment</span>
        </p>
        {specs.length > 0 ? (
          <p className="mt-1 text-sm text-slate-600">{specs.join(" · ")}</p>
        ) : null}

        <dl className="mt-3 space-y-0.5 text-xs text-slate-500">
          {listing.deposit_paid_to_date != null ? (
            <div>
              <span className="text-slate-400">Deposit paid:</span>{" "}
              {money(listing.deposit_paid_to_date)}
            </div>
          ) : null}
          {listing.occupancy_estimate ? (
            <div>
              <span className="text-slate-400">Occupancy:</span>{" "}
              {listing.occupancy_estimate}
            </div>
          ) : null}
          {listing.co_op_commission_note ? (
            <div>
              <span className="text-slate-400">Co-op:</span>{" "}
              {listing.co_op_commission_note}
            </div>
          ) : null}
        </dl>

        {listing.notes ? (
          <p className="mt-3 line-clamp-3 text-sm text-slate-600">{listing.notes}</p>
        ) : null}

        <div className="mt-auto border-t border-slate-100 pt-3">
          <p className="text-sm font-medium text-slate-700">{listing.realtor_name}</p>
          <p className="text-xs text-slate-500">{listing.brokerage_name}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <a
              href={`tel:${listing.contact_phone.replace(/[^\d+]/g, "")}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {listing.contact_phone}
            </a>
            <a
              href={`mailto:${listing.contact_email}`}
              className="font-medium text-brand-700 hover:underline"
            >
              Email
            </a>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
