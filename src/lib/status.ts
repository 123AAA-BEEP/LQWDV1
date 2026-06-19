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

export type SuggestionStatus =
  | "new"
  | "under_review"
  | "planned"
  | "in_progress"
  | "shipped"
  | "declined";

export const SUGGESTION_STATUS: Record<
  SuggestionStatus,
  { label: string; tone: Tone }
> = {
  new: { label: "New", tone: "brand" },
  under_review: { label: "Under review", tone: "warning" },
  planned: { label: "Planned", tone: "brand" },
  in_progress: { label: "In progress", tone: "warning" },
  shipped: { label: "Shipped", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
};

export const SUGGESTION_CATEGORY_LABELS: Record<string, string> = {
  idea: "Idea",
  feature_request: "Feature request",
  complaint: "Complaint",
  business_opportunity: "Business opportunity",
  other: "Other",
};

export type MediaCandidateStatus = "pending" | "approved" | "rejected";

export const MEDIA_CANDIDATE_STATUS: Record<
  MediaCandidateStatus,
  { label: string; tone: Tone }
> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};
