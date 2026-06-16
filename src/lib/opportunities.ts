/**
 * Shared constants + helpers for the developer opportunities marketplace.
 * Mirrors supabase/migrations/0004_opportunities.sql.
 */

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

export type OpportunityStatus =
  | "draft"
  | "open"
  | "paused"
  | "closed"
  | "suspended";

export type DealType = "single_property" | "units" | "portfolio";
export type PriceBasis = "total" | "per_unit";
export type UnitStatus = "available" | "pending" | "sold" | "withdrawn";
export type BidStatus =
  | "open"
  | "accepted"
  | "declined"
  | "countered"
  | "withdrawn";

export const OPPORTUNITY_STATUS: Record<
  OpportunityStatus,
  { label: string; tone: Tone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "success" },
  paused: { label: "Paused", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
  suspended: { label: "Suspended", tone: "danger" },
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  single_property: "Single property",
  units: "Units in one property",
  portfolio: "Portfolio (multiple properties)",
};

export const PRICE_BASIS_LABELS: Record<PriceBasis, string> = {
  total: "Total",
  per_unit: "Per unit",
};

export const UNIT_STATUS: Record<UnitStatus, { label: string; tone: Tone }> = {
  available: { label: "Available", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  sold: { label: "Sold", tone: "neutral" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export const BID_STATUS: Record<BidStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  countered: { label: "Countered", tone: "brand" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

/**
 * The fields a developer can choose to hide from the realtor marketplace. The
 * keys here must match the `case when '<key>' = any(hidden_fields)` masking in
 * the opportunities_market_view / opportunity_units_market_view.
 */
export const HIDEABLE_FIELDS = [
  { key: "address", label: "Property address" },
  { key: "city", label: "City / location" },
  { key: "price", label: "Asking price" },
  { key: "commission", label: "Commission" },
  { key: "incentive", label: "Incentive" },
  { key: "unit_count", label: "Number of units" },
  { key: "developer", label: "Developer identity" },
] as const;

export type HideableFieldKey = (typeof HIDEABLE_FIELDS)[number]["key"];

export function isHidden(
  hiddenFields: string[] | null | undefined,
  key: HideableFieldKey,
): boolean {
  return (hiddenFields ?? []).includes(key);
}

const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export function formatMoney(n: number | null | undefined): string | null {
  if (n === null || n === undefined) return null;
  return cad.format(n);
}

export function formatCommission(pct: number | null | undefined): string | null {
  if (pct === null || pct === undefined) return null;
  return `${pct}%`;
}
