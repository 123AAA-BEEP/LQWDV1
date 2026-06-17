/**
 * Status labels + badge tones for the admin review queues.
 * Tone values match the Badge component's tones.
 */
type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

export type SubmissionStatus =
  | "draft"
  | "pending_review"
  | "needs_changes"
  | "approved"
  | "rejected";

export type UpdateStatus =
  | "pending_review"
  | "needs_changes"
  | "approved"
  | "rejected";

export type ProposalStatus =
  | "submitted"
  | "under_review"
  | "countered"
  | "accepted"
  | "declined"
  | "withdrawn"
  | "expired";

export type RecordStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "published"
  | "archived";

export const SUBMISSION_STATUS: Record<
  SubmissionStatus,
  { label: string; tone: Tone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "Pending review", tone: "warning" },
  needs_changes: { label: "Needs changes", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const UPDATE_STATUS: Record<
  UpdateStatus,
  { label: string; tone: Tone }
> = {
  pending_review: { label: "Pending review", tone: "warning" },
  needs_changes: { label: "Needs changes", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export const PROPOSAL_STATUS: Record<
  ProposalStatus,
  { label: string; tone: Tone }
> = {
  submitted: { label: "Submitted", tone: "warning" },
  under_review: { label: "Under review", tone: "warning" },
  countered: { label: "Countered", tone: "brand" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};

/** Statuses that still need an admin decision (the "to review" queue). */
export const PROPOSAL_OPEN_STATUSES: ProposalStatus[] = [
  "submitted",
  "under_review",
];

export const PROPOSAL_FORMAT_LABELS: Record<string, string> = {
  worksheet: "Worksheet",
  freeform: "Freeform",
};

// ---- RFP / Deal Desk --------------------------------------------------------

export type RfpStatus =
  | "draft"
  | "open"
  | "shortlisting"
  | "awarded"
  | "closed"
  | "cancelled";

export type RfpProposalStatus =
  | "submitted"
  | "shortlisted"
  | "awarded"
  | "declined"
  | "withdrawn";

export const RFP_STATUS: Record<RfpStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "success" },
  shortlisting: { label: "Shortlisting", tone: "brand" },
  awarded: { label: "Awarded", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const RFP_PROPOSAL_STATUS: Record<
  RfpProposalStatus,
  { label: string; tone: Tone }
> = {
  submitted: { label: "Submitted", tone: "warning" },
  shortlisted: { label: "Shortlisted", tone: "brand" },
  awarded: { label: "Awarded", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

export const RFP_TYPE_LABELS: Record<string, string> = {
  new_listing: "New listing mandate",
  bulk_purchase: "Bulk purchase",
  inventory_unit: "Inventory unit",
  trouble_unit: "Trouble unit",
  full_development: "Full development",
};

export const RFP_TYPE_OPTIONS = Object.keys(RFP_TYPE_LABELS);

export const DEAL_SIDE_LABELS: Record<string, string> = {
  buy: "Buy-side",
  list: "List-side",
};

export const RFP_VISIBILITY_LABELS: Record<string, string> = {
  invited: "Invitation-only",
  all_ultra: "All ultra realtors",
};

export function rfpTypeLabel(type: string): string {
  return RFP_TYPE_LABELS[type] ?? type;
}

export function dealSideLabel(side: string): string {
  return DEAL_SIDE_LABELS[side] ?? side;
}

export const RECORD_STATUS: Record<
  RecordStatus,
  { label: string; tone: Tone }
> = {
  draft: { label: "Draft", tone: "neutral" },
  pending_review: { label: "Pending review", tone: "warning" },
  approved: { label: "Approved", tone: "brand" },
  published: { label: "Published", tone: "success" },
  archived: { label: "Archived", tone: "neutral" },
};

export const RECORD_STATUS_OPTIONS: RecordStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "archived",
];

export const UPDATE_TYPE_LABELS: Record<string, string> = {
  pricing: "Pricing",
  incentives: "Incentives",
  availability: "Availability / status",
  broker_portal: "Broker portal",
  media: "Media / images",
  general: "General correction",
};

export const UPDATE_TYPE_OPTIONS = Object.keys(UPDATE_TYPE_LABELS);

export function updateTypeLabel(type: string): string {
  return UPDATE_TYPE_LABELS[type] ?? type;
}
