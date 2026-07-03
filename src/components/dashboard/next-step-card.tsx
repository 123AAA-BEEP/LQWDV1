import { ShieldCheck, CheckCircle2, Circle, Clock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import type { VerificationStatus } from "@/lib/types";

/**
 * The "your next step" hero for agents who aren't approved yet — the first
 * thing an unverified user should see and act on. State-aware: nudges to
 * verify, shows "under review" once submitted, and explains rejection or
 * suspension instead of leaving locked cards to do the talking.
 */
export function NextStepCard({
  status,
  hasSubmitted,
}: {
  status: VerificationStatus;
  hasSubmitted: boolean;
}) {
  if (status === "approved") return null;

  const suspended = status === "suspended";
  const rejected = status === "rejected";
  const underReview = status === "pending" && hasSubmitted;

  const headline = suspended
    ? "Your account is suspended"
    : rejected
      ? "Your verification needs another look"
      : underReview
        ? "Verification submitted — under review"
        : "One step left: verify your RECO registration";
  const body = suspended
    ? "Broker tools are paused. If you think this is a mistake, reply to any LIQWD email and we'll take a look."
    : rejected
      ? "Resubmit with your RECO registration number and current brokerage — approvals usually happen the same day."
      : underReview
        ? "We'll email you the moment you're approved (usually same day). Meanwhile you can read the playbook or add a project you know."
        : "Takes about 2 minutes. Unlocks project browsing, commission details, and buyer leads routed to you — free, from your current brokerage.";

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
            {underReview ? (
              <Clock className="size-5 text-brand-700" strokeWidth={1.75} aria-hidden />
            ) : (
              <ShieldCheck className="size-5 text-brand-700" strokeWidth={1.75} aria-hidden />
            )}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Your next step
            </p>
            <h2 className="mt-1 text-lg font-semibold text-ink">{headline}</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              {body}
            </p>
          </div>
        </div>
        {!suspended ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {underReview ? (
              <>
                <ButtonLink href="/dashboard/learn" variant="secondary" size="sm">
                  Open the playbook
                </ButtonLink>
                <ButtonLink href="/dashboard/submit" size="sm">
                  Add a project
                </ButtonLink>
              </>
            ) : (
              <ButtonLink href="/dashboard/verify">
                {rejected ? "Resubmit verification" : "Verify now"}
              </ButtonLink>
            )}
          </div>
        ) : null}
      </div>

      {/* The 3-step path, so the finish line is visible */}
      <ol className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-medium">
        <Step done label="Create your account" />
        <Step
          done={false}
          current
          label={underReview ? "RECO check (in review)" : "Verify your RECO"}
        />
        <Step done={false} label="Start receiving leads" />
      </ol>
    </div>
  );
}

function Step({
  done,
  current = false,
  label,
}: {
  done: boolean;
  current?: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-1.5">
      {done ? (
        <CheckCircle2 className="size-4 text-brand-600" aria-hidden />
      ) : (
        <Circle
          className={current ? "size-4 text-brand-600" : "size-4 text-slate-300"}
          aria-hidden
        />
      )}
      <span className={done || current ? "text-slate-700" : "text-slate-400"}>
        {label}
      </span>
    </li>
  );
}
