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
