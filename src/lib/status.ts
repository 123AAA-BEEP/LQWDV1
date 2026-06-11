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
