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

export type RealtorTier = "standard" | "ultra";

/** Paid self-serve subscription ladder. Ultra includes everything in Pro. */
export type Plan = "free" | "pro" | "ultra";

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
  reco_expiry: string | null;
  reco_verified_at: string | null;
  reco_verification_method: "certificate" | "manual" | null;
  verification_status: VerificationStatus;
  realtor_tier: RealtorTier;
  plan: Plan;
  developer_mandate_access: boolean;
  mandate_connect_credits: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  bio_short: string | null;
  service_area: string | null;
  is_public_profile_enabled: boolean;
  referral_code: string | null;
  referred_by_profile_id: string | null;
  pro_until: string | null;
  created_at: string;
  updated_at: string;
}

/** True when a profile holds active reward-granted Pro time. */
export function hasActivePro(profile: Pick<Profile, "pro_until">): boolean {
  return !!profile.pro_until && new Date(profile.pro_until).getTime() > Date.now();
}

export type ReferralStatus = "pending" | "qualified" | "void";

export interface Referral {
  id: string;
  referrer_profile_id: string;
  referred_profile_id: string;
  status: ReferralStatus;
  qualified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type RewardReason =
  | "referral_referrer"
  | "referral_referred"
  | "submission_approved"
  | "update_approved"
  | "manual";

export interface RewardLedgerEntry {
  id: string;
  profile_id: string;
  reason: RewardReason;
  days_granted: number;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const REWARD_REASON_LABELS: Record<RewardReason, string> = {
  referral_referrer: "Referral — invited a colleague",
  referral_referred: "Referral — joined via invite",
  submission_approved: "Approved project submission",
  update_approved: "Approved project update",
  manual: "Manual adjustment",
};

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
  is_featured: boolean | null;
  featured_rank: number | null;
  created_at: string | null;
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
  section_intro: string | null;
  section_amenities: string | null;
  section_getting_around: string | null;
  section_developer: string | null;
  neighbourhood_features: NeighbourhoodFeatures | null;
}

/** A single nearby place from the OSM-sourced neighbourhood enrichment. */
export interface NeighbourhoodFeature {
  name: string;
  distance_m: number;
  /** e.g. transit station type ("subway", "GO"); EQAO rank layered in later. */
  kind?: string | null;
  rank?: number | null;
}

/** Structured nearby features, by category, in display-priority order. */
export interface NeighbourhoodFeatures {
  hospitals?: NeighbourhoodFeature[];
  shopping?: NeighbourhoodFeature[];
  schools?: NeighbourhoodFeature[];
  postsecondary?: NeighbourhoodFeature[];
  transit?: NeighbourhoodFeature[];
  groceries?: NeighbourhoodFeature[];
  parks?: NeighbourhoodFeature[];
  poi?: NeighbourhoodFeature[];
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

export type MandateStatus = "draft" | "active" | "matched" | "closed";
export type PreApprovalStatus = "none" | "pre_qualified" | "pre_approved";

export interface BuyerMandate {
  id: string;
  submitted_by_user_id: string;
  buyer_label: string | null;
  status: MandateStatus;
  location_areas: string | null;
  location_radius_km: number | null;
  price_min: number | null;
  price_max: number | null;
  financing_type: string | null;
  size_sqft_min: number | null;
  size_sqft_max: number | null;
  beds_min: number | null;
  baths_min: number | null;
  lot_notes: string | null;
  property_type: string | null;
  condition: string | null;
  timeline: string | null;
  must_haves: string | null;
  nice_to_haves: string | null;
  pre_approval_status: PreApprovalStatus;
  pre_approval_amount: number | null;
  lender: string | null;
  pre_approval_expiry: string | null;
  proof_of_funds: boolean;
  rep_agreement_signed: boolean;
  id_verified: boolean;
  deposit_ready: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * The buyer-readiness checklist the agent self-attests to. Surfaced to
 * developers so they can gauge how "ready" a buyer is at a glance. (A future
 * run adds document upload + automated checks to back each item.)
 */
export interface MandateChecklistItem {
  key: string;
  label: string;
  done: boolean;
}
export function mandateChecklist(m: {
  rep_agreement_signed?: boolean | null;
  pre_approval_status?: string | null;
  proof_of_funds?: boolean | null;
  id_verified?: boolean | null;
  deposit_ready?: boolean | null;
}): MandateChecklistItem[] {
  return [
    { key: "bra", label: "Buyer rep agreement", done: !!m.rep_agreement_signed },
    { key: "preapproval", label: "Mortgage pre-approval", done: m.pre_approval_status === "pre_approved" },
    { key: "funds", label: "Proof of funds", done: !!m.proof_of_funds },
    { key: "id", label: "ID verified", done: !!m.id_verified },
    { key: "deposit", label: "Deposit ready", done: !!m.deposit_ready },
  ];
}

/**
 * A mandate is "Verified" when the buyer is fully pre-approved with funds and a
 * signed representation agreement, and the pre-approval has not lapsed. This is
 * the trust signal listing-side sees. (Stage 2 confirms via parsed documents.)
 */
export function isMandateVerified(
  m: Pick<
    BuyerMandate,
    | "pre_approval_status"
    | "pre_approval_expiry"
    | "proof_of_funds"
    | "rep_agreement_signed"
  >,
): boolean {
  const notExpired =
    !m.pre_approval_expiry || new Date(m.pre_approval_expiry) >= new Date();
  return (
    m.pre_approval_status === "pre_approved" &&
    m.proof_of_funds &&
    m.rep_agreement_signed &&
    notExpired
  );
}

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
// Rental dimension, PBR referral terms & suggestions (migrations 0004 / 0005)
// =============================================================================
//
// NOTE: a reusable buyer profile ("worksheet") is intentionally NOT modelled
// here — the platform's existing `buyer_mandates` covers that concept. These
// types match what is applied to the live DB: the rental dimension on projects,
// the PBR referral terms table, and the suggestions inbox.

// --- projects extensions ---------------------------------------------------
export type ListingType = "for_sale" | "for_rent" | "mixed_use";
export type PricePeriod = "total" | "monthly";
export type CreditBand = "excellent" | "good" | "fair" | "poor" | "unknown";

// --- project rental referral terms (PBR) -----------------------------------
export type ReferralFeeType = "months_rent" | "percent_first_year" | "flat";
export type ServiceMode = "self_serve" | "full_service";

export interface ProjectRentalReferralTerms {
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

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  new: "New",
  under_review: "Under review",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
  declined: "Declined",
};
