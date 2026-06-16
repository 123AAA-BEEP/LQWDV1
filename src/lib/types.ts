/**
 * Minimal TypeScript types mirroring the LIQWD Supabase schema
 * (see supabase/migrations/0001_structural.sql). Not exhaustive — covers the
 * fields the app currently reads/writes.
 */

export type UserRole = "admin" | "realtor" | "developer";
export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";
export type RealtorTitle =
  | "sales_representative"
  | "broker"
  | "broker_of_record";

export type SubmissionStatus =
  | "draft"
  | "pending_review"
  | "needs_changes"
  | "approved"
  | "rejected";

export interface Profile {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  title: RealtorTitle | null;
  email: string | null;
  phone: string | null;
  brokerage_id: string | null;
  brokerage_name: string | null;
  reco_registration_number: string | null;
  verification_status: VerificationStatus;
  avatar_url: string | null;
  logo_url: string | null;
  bio_short: string | null;
  service_area: string | null;
  is_public_profile_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  sales_status: string | null;
  construction_status: string | null;
  occupancy_estimate_text: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  hero_image_url: string | null;
  record_status: string;
}

export interface PublicProject {
  project_id: string;
  public_page_id: string;
  slug: string;
  seo_title: string | null;
  seo_meta_description: string | null;
  page_title: string | null;
  page_summary: string | null;
  page_description: string | null;
  canonical_url: string | null;
  custom_cta_text: string | null;
  assigned_realtor_profile_id: string | null;
  project_name: string;
  headline: string | null;
  description_short: string | null;
  description_long: string | null;
  builder_name: string | null;
  city: string | null;
  municipality: string | null;
  province: string | null;
  neighbourhood: string | null;
  occupancy_estimate_text: string | null;
  total_units: number | null;
  storeys: number | null;
  bedrooms_summary: string | null;
  size_range_sqft_min: number | null;
  size_range_sqft_max: number | null;
  price_from_public: number | null;
  price_to_public: number | null;
  price_currency: string | null;
  hero_image_url: string | null;
}

export interface RealtorCard {
  profile_id: string;
  first_name: string | null;
  last_name: string | null;
  title: RealtorTitle | null;
  brokerage: string | null;
  email: string | null;
  phone: string | null;
}

export interface Opportunity {
  id: string;
  developer_id: string;
  title: string;
  deal_type: string;
  summary: string | null;
  city: string | null;
  province: string | null;
  unit_count: number | null;
  asking_price: number | null;
  price_basis: string;
  commission_percent: number | null;
  incentive_amount: number | null;
  incentive_notes: string | null;
  hidden_fields: string[];
  address_full: string | null;
  internal_notes: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface OpportunityUnit {
  id: string;
  opportunity_id: string;
  label: string;
  unit_type: string | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  asking_price: number | null;
  address_full: string | null;
  internal_notes: string | null;
  status: string;
  sort_order: number;
}

/** A row from opportunities_market_view — already masked for the realtor side. */
export interface OpportunityMarketRow {
  id: string;
  title: string;
  deal_type: string;
  summary: string | null;
  status: string;
  province: string | null;
  price_basis: string;
  hidden_fields: string[];
  published_at: string | null;
  created_at: string;
  city: string | null;
  unit_count: number | null;
  asking_price: number | null;
  commission_percent: number | null;
  incentive_amount: number | null;
  incentive_notes: string | null;
  address_full: string | null;
  developer_name: string | null;
  bid_count: number;
}

export interface OpportunityBid {
  id: string;
  opportunity_id: string;
  realtor_id: string;
  bid_commission_percent: number | null;
  bid_incentive_amount: number | null;
  bid_price: number | null;
  message: string | null;
  status: string;
  developer_response: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  opportunity_id: string | null;
  bid_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export const TITLE_LABELS: Record<RealtorTitle, string> = {
  sales_representative: "Sales Representative",
  broker: "Broker",
  broker_of_record: "Broker of Record",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

/** Format a CAD price band like "From $599,000" / "$599,000 – $1,250,000". */
export function formatPriceBand(
  from: number | null,
  to: number | null,
): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(n);
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Up to ${fmt(to)}`;
  return null;
}
