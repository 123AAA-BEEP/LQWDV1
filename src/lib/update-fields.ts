/**
 * Registry of project fields a realtor can propose changes to through "Suggest
 * an update". Each maps to a real, broker-safe column on a known table.
 *
 * Intentionally EXCLUDES provenance (external_source, import_notes, …) and the
 * AI-generated SEO / section copy — realtors propose facts, not the marketing
 * prose. This single list drives both the suggest form (pre-filled inputs +
 * diff) and the admin apply engine (field → table/column write).
 */

export type UpdateFieldType =
  | "currency"
  | "number"
  | "text"
  | "enum"
  | "boolean"
  | "url";

export type UpdateFieldSource = "project" | "commercials" | "portal";

export interface UpdateField {
  key: string;
  label: string;
  group: string;
  source: UpdateFieldSource;
  /** Column on the source table. (Portal changes are handled specially.) */
  column?: string;
  type: UpdateFieldType;
  options?: readonly { value: string; label: string }[];
  hint?: string;
}

export const SALES_STATUS_OPTIONS = [
  { value: "coming_soon", label: "Coming soon" },
  { value: "selling", label: "Selling" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "completed", label: "Completed" },
  { value: "unknown", label: "Unknown" },
] as const;

export const PROJECT_TYPE_OPTIONS = [
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhouse" },
  { value: "single_family", label: "Single family / detached" },
] as const;

export const UPDATE_FIELDS: readonly UpdateField[] = [
  {
    key: "price_from_public",
    label: "Price from",
    group: "Pricing & availability",
    source: "project",
    column: "price_from_public",
    type: "currency",
  },
  {
    key: "price_to_public",
    label: "Price to",
    group: "Pricing & availability",
    source: "project",
    column: "price_to_public",
    type: "currency",
  },
  {
    key: "sales_status",
    label: "Sales status",
    group: "Pricing & availability",
    source: "project",
    column: "sales_status",
    type: "enum",
    options: SALES_STATUS_OPTIONS,
  },
  {
    key: "total_units",
    label: "Total units",
    group: "Project details",
    source: "project",
    column: "total_units",
    type: "number",
  },
  {
    key: "storeys",
    label: "Storeys",
    group: "Project details",
    source: "project",
    column: "storeys",
    type: "number",
  },
  {
    key: "project_type",
    label: "Project type",
    group: "Project details",
    source: "project",
    column: "project_type",
    type: "enum",
    options: PROJECT_TYPE_OPTIONS,
  },
  {
    key: "neighbourhood",
    label: "Neighbourhood",
    group: "Project details",
    source: "project",
    column: "neighbourhood",
    type: "text",
  },
  {
    key: "commission_percent",
    label: "Commission %",
    group: "Commission (broker-only)",
    source: "commercials",
    column: "commission_percent",
    type: "number",
    hint: "Co-op commission paid to brokers — e.g. 3.5",
  },
  {
    key: "commission_summary",
    label: "Commission summary",
    group: "Commission (broker-only)",
    source: "commercials",
    column: "commission_summary",
    type: "text",
  },
  {
    key: "commission_is_negotiable",
    label: "Commission negotiable?",
    group: "Commission (broker-only)",
    source: "commercials",
    column: "commission_is_negotiable",
    type: "boolean",
  },
  {
    key: "broker_portal_url",
    label: "Broker portal link",
    group: "Broker portal",
    source: "portal",
    type: "url",
    hint: "The current VIP / broker portal URL for this project",
  },
] as const;

export const UPDATE_FIELD_GROUPS: string[] = [
  ...new Set(UPDATE_FIELDS.map((f) => f.group)),
];

export function getUpdateField(key: string): UpdateField | undefined {
  return UPDATE_FIELDS.find((f) => f.key === key);
}

/** A single proposed change as stored in update_payload.changes[]. */
export interface ProposedChange {
  key: string;
  label: string;
  group: string;
  source: UpdateFieldSource;
  column?: string;
  type: UpdateFieldType;
  /** Current (raw) value at submission and the proposed (raw) value. */
  from: string;
  to: string;
}

export const IMAGE_KIND_OPTIONS = [
  { value: "rendering", label: "Rendering" },
  { value: "floor_plan", label: "Floor plan" },
  { value: "gallery", label: "Gallery photo" },
  { value: "other", label: "Other" },
] as const;

/** Render a raw stored value as a friendly string for the diff display. */
export function formatFieldValue(type: UpdateFieldType, raw: string): string {
  const v = (raw ?? "").trim();
  if (v === "") return "—";
  if (type === "boolean") return v === "true" ? "Yes" : "No";
  if (type === "enum") {
    const opt = [...SALES_STATUS_OPTIONS, ...PROJECT_TYPE_OPTIONS].find(
      (o) => o.value === v,
    );
    return opt ? opt.label : v;
  }
  if (type === "currency") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? `$${n.toLocaleString("en-CA")}` : v;
  }
  return v;
}
