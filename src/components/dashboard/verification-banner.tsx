import { ButtonLink } from "@/components/ui/button";
import type { VerificationStatus } from "@/lib/types";

const COPY: Record<
  Exclude<VerificationStatus, "approved">,
  { tone: string; text: string; cta: string }
> = {
  pending: {
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    text: "Your account is awaiting RECO verification. Broker-only features unlock once you're approved.",
    cta: "Complete verification",
  },
  rejected: {
    tone: "border-red-200 bg-red-50 text-red-700",
    text: "Your verification was not approved. Review the details and resubmit.",
    cta: "Resubmit verification",
  },
  suspended: {
    tone: "border-red-200 bg-red-50 text-red-700",
    text: "Your account is suspended. Contact support to restore access.",
    cta: "View status",
  },
};

export function VerificationBanner({
  status,
}: {
  status: VerificationStatus;
}) {
  if (status === "approved") return null;
  const copy = COPY[status];
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${copy.tone}`}>
      <span>{copy.text}</span>
      <ButtonLink href="/dashboard/verify" size="sm" variant="secondary" className="shrink-0">
        {copy.cta}
      </ButtonLink>
    </div>
  );
}
