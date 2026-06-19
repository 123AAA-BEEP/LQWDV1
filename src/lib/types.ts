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

/** Format a monthly CAD rent band like "From $2,400/mo". */
export function formatRentBand(
  from: number | null,
  to: number | null,
): string | null {
  const band = formatPriceBand(from, to);
  return band ? `${band}/mo` : null;
}

// =============================================================================
// Worksheets, PBR referrals & suggestions (migrations 0004 / 0005)
// =============================================================================

// --- projects extensions ---------------------------------------------------
export type ListingType = "for_sale" | "for_rent" | "mixed_use";
export type PricePeriod = "total" | "monthly";
export type LeadSource = "public_form" | "worksheet";

// --- worksheets ------------------------------------------------------------
export type WorksheetType = "purchase" | "rental";
export type WorksheetStatus = "active" | "archived";
export type FinancingStatus =
  | "not_started"
  | "pre_qualified"
  | "pre_approved"
  | "cash";
export type CreditBand = "excellent" | "good" | "fair" | "poor" | "unknown";

export interface Worksheet {
  id: string;
  owner_profile_id: string;
  worksheet_type: WorksheetType;
  label: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  desired_beds_min: number | null;
  desired_beds_max: number | null;
  desired_baths_min: number | null;
  preferred_unit_types: string[] | null;
  parking_required: boolean | null;
  locker_required: boolean | null;
  desired_move_in_date: string | null;
  notes: string | null;
  budget_min: number | null;
  budget_max: number | null;
  deposit_ready_amount: number | null;
  financing_status: FinancingStatus | null;
  rent_budget_min: number | null;
  rent_budget_max: number | null;
  annual_household_income: number | null;
  credit_band: CreditBand | null;
  lease_term_months: number | null;
  num_occupants: number | null;
  has_pets: boolean | null;
  status: WorksheetStatus;
  created_at: string;
  updated_at: string;
}

// --- worksheet submissions -------------------------------------------------
export type SubmissionKind = "purchase_worksheet" | "rental_referral";
export type WorksheetSubmissionStatus =
  | "submitted"
  | "received"
  | "in_progress"
  | "client_not_submitting"
  | "client_ineligible"
  | "accepted"
  | "declined"
  | "withdrawn";
export type PayoutStatus = "none" | "eligible" | "invoiced" | "paid" | "void";

export interface WorksheetSubmission {
  id: string;
  worksheet_id: string;
  project_id: string;
  floorplan_id: string | null;
  submitted_by_profile_id: string | null;
  submitting_brokerage_id: string | null;
  submission_kind: SubmissionKind;
  snapshot: Record<string, unknown>;
  offered_price: number | null;
  requested_incentives: string | null;
  message: string | null;
  matched_terms: boolean | null;
  referral_fee_quoted: string | null;
  lead_id: string | null;
  status: WorksheetSubmissionStatus;
  developer_response_notes: string | null;
  reviewed_by_profile_id: string | null;
  reviewed_at: string | null;
  payout_status: PayoutStatus;
  created_at: string;
  updated_at: string;
}

// --- project referral terms (PBR) ------------------------------------------
export type ReferralFeeType = "months_rent" | "percent_first_year" | "flat";
export type ServiceMode = "self_serve" | "full_service";

export interface ProjectReferralTerms {
  id: string;
  project_id: string;
  accepts_referrals: boolean;
  referral_fee_type: ReferralFeeType | null;
  referral_fee_value: number | null;
  referral_fee_notes: string | null;
  payout_terms: string | null;
  min_lease_term_months: number | null;
  min_household_income: number | null;
  min_credit_band: CreditBand | null;
  pets_allowed: boolean | null;
  earliest_move_in: string | null;
  latest_move_in: string | null;
  required_fields: string[] | null;
  routes_to_profile_id: string | null;
  service_mode: ServiceMode;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferralOpportunity {
  project_id: string;
  project_name: string;
  city: string | null;
  neighbourhood: string | null;
  hero_image_url: string | null;
  rent_from: number | null;
  rent_to: number | null;
  price_period: PricePeriod | null;
  referral_fee_type: ReferralFeeType | null;
  referral_fee_value: number | null;
  referral_fee_notes: string | null;
  min_lease_term_months: number | null;
  min_credit_band: CreditBand | null;
  pets_allowed: boolean | null;
  service_mode: ServiceMode;
}

// --- platform suggestions ("Got an idea?") ---------------------------------
export type SuggestionCategory =
  | "idea"
  | "feature_request"
  | "complaint"
  | "business_opportunity"
  | "other";
export type SuggestionStatus =
  | "new"
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "declined";

export interface PlatformSuggestion {
  id: string;
  submitted_by_profile_id: string;
  category: SuggestionCategory;
  title: string;
  body: string | null;
  open_to_collaborate: boolean;
  contact_ok: boolean;
  status: SuggestionStatus;
  public_response: string | null;
  admin_notes: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- UI label maps ---------------------------------------------------------
export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  for_sale: "For sale",
  for_rent: "For rent",
  mixed_use: "Mixed use",
};

export const WORKSHEET_SUBMISSION_STATUS_LABELS: Record<
  WorksheetSubmissionStatus,
  string
> = {
  submitted: "Submitted",
  received: "Received",
  in_progress: "In progress",
  client_not_submitting: "Client not submitting",
  client_ineligible: "Client ineligible",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: "New",
  under_review: "Under review",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
};
