import type { Metadata } from "next";
import { ShieldCheck, Upload } from "lucide-react";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS } from "@/lib/types";
import { submitVerification, verifyRecoCertificate } from "./actions";

export const metadata: Metadata = { title: "Verification" };

const RECO_NOTICE: Record<string, { tone: "success" | "warning" | "error" | "info"; msg: string }> = {
  approved: { tone: "success", msg: "Verified! We matched your RECO certificate and unlocked your account." },
  nomatch: { tone: "warning", msg: "We couldn't confidently match that certificate to your profile. Make sure your name and RECO number match the document, or submit below for manual review." },
  unavailable: { tone: "info", msg: "Instant verification is temporarily unavailable. Submit below and we'll review it manually." },
  saveerror: { tone: "error", msg: "We matched your certificate but couldn't save your verification. Please try again in a moment — if it keeps happening, contact support." },
  badtype: { tone: "error", msg: "Please upload a PDF or an image (PNG, JPG, or WebP)." },
  toobig: { tone: "error", msg: "That file is too large — please keep it under 4 MB." },
  nofile: { tone: "error", msg: "Choose your RECO certificate file first." },
  already: { tone: "info", msg: "You're already verified." },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; reco?: string }>;
}) {
  const { error, message, reco } = await searchParams;
  const { userId, profile } = await requireUserProfile();
  const status = profile.verification_status;
  const recoNotice = reco ? RECO_NOTICE[reco] : undefined;

  // Off-market listings they claimed that are waiting on this verification
  // (owners can read their own held rows — migration 0050).
  let heldTitles: string[] = [];
  if (status !== "approved") {
    const supabase = await createClient();
    const { data: held } = await supabase
      .from("off_market_listings")
      .select("title")
      .eq("claimed_by_profile_id", userId)
      .eq("status", "pending_claim")
      .limit(3);
    heldTitles = ((held ?? []) as { title: string }[]).map((h) => h.title);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          RECO verification
        </h1>
        <Badge tone={verificationBadgeTone(status)}>
          {VERIFICATION_LABELS[status]}
        </Badge>
      </div>

      {heldTitles.length > 0 ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">
            Your claimed listing{heldTitles.length > 1 ? "s go" : " goes"} live
            the moment you&apos;re verified
          </p>
          <p className="mt-0.5 truncate text-sm text-brand-700">
            {heldTitles.join(" · ")}
          </p>
        </div>
      ) : null}

      {status === "approved" ? (
        <Notice tone="success">
          You’re verified. All broker-only features are unlocked.
        </Notice>
      ) : null}
      {status === "suspended" ? (
        <Notice tone="error">
          Your account is suspended. Please contact support.
        </Notice>
      ) : null}
      {message === "submitted" ? (
        <Notice tone="success">
          Submitted — we typically review within a day, and we&apos;ll email you
          the moment you&apos;re approved.
          {heldTitles.length > 0
            ? " Your claimed listing goes live automatically on approval."
            : ""}
        </Notice>
      ) : null}
      {recoNotice ? <Notice tone={recoNotice.tone}>{recoNotice.msg}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {status !== "approved" && status !== "suspended" ? (
        <>
          {/* Instant verification — upload the RECO certificate */}
          <Card>
            <CardBody>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <ShieldCheck className="size-5 text-brand-600" strokeWidth={1.75} aria-hidden />
                </span>
                <div>
                  <h2 className="font-semibold text-ink">Verify instantly</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload your RECO registration certificate and we’ll verify
                    you automatically — usually in seconds. We read the document
                    to confirm your name, registration number, and status, then{" "}
                    <span className="font-medium text-slate-600">delete the file</span>.
                    We never store it.
                  </p>
                </div>
              </div>
              <form
                action={verifyRecoCertificate}
                encType="multipart/form-data"
                className="mt-5 space-y-4"
              >
                <Field label="RECO certificate (PDF or image)" htmlFor="certificate">
                  <input
                    id="certificate"
                    name="certificate"
                    type="file"
                    required
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                </Field>
                <SubmitButton pendingLabel="Verifying…">
                  <Upload className="size-4" aria-hidden /> Verify my certificate
                </SubmitButton>
              </form>
            </CardBody>
          </Card>

          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or submit for manual review
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Manual path — enter RECO number, admin reviews */}
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">
                No certificate handy? Enter your RECO registration details and
                we’ll review them manually.
              </p>
              <form action={submitVerification} className="mt-5 space-y-4">
                <Field label="RECO registration number" htmlFor="reco_registration_number">
                  <Input
                    id="reco_registration_number"
                    name="reco_registration_number"
                    required
                    defaultValue={profile.reco_registration_number ?? ""}
                  />
                </Field>
                <Field label="Brokerage name" htmlFor="brokerage_name_submitted">
                  <Input
                    id="brokerage_name_submitted"
                    name="brokerage_name_submitted"
                    defaultValue={profile.brokerage_name ?? ""}
                  />
                </Field>
                <Field label="Notes (optional)" htmlFor="notes">
                  <Textarea id="notes" name="notes" />
                </Field>
                <SubmitButton variant="secondary" pendingLabel="Submitting for review…">
                  {status === "rejected" ? "Resubmit for review" : "Submit for manual review"}
                </SubmitButton>
              </form>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
