/** Lead pipeline statuses, shared by the admin leads view + its actions. */

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

// Labels speak agent, not CRM: each one answers "where is this buyer, in my
// words". DB values are storage keys only — renaming a label needs no
// migration.
export const LEAD_STATUS_META: Record<LeadStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "warning" },
  contacted: { label: "Contacted", tone: "brand" },
  qualified: { label: "Active buyer", tone: "brand" },
  won: { label: "Deal closed", tone: "success" },
  lost: { label: "Went cold", tone: "neutral" },
};

export function leadStatusMeta(status: string | null): { label: string; tone: Tone } {
  return (
    LEAD_STATUS_META[(status ?? "new") as LeadStatus] ?? {
      label: status ?? "—",
      tone: "neutral" as Tone,
    }
  );
}
