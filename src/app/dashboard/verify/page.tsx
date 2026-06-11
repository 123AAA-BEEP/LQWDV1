import type { Metadata } from "next";
import { requireUserProfile } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Badge, verificationBadgeTone } from "@/components/ui/badge";
import { VERIFICATION_LABELS } from "@/lib/types";
import { submitVerification } from "./actions";

export const metadata: Metadata = { title: "Verification" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const { profile } = await requireUserProfile();
  const status = profile.verification_status;

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
          Your verification request was submitted. We’ll review it shortly.
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {status !== "approved" && status !== "suspended" ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">
              Access is reserved for verified Ontario realtors. Verify using
              your RECO registration details.
            </p>
            <form action={submitVerification} className="mt-5 space-y-4">
              <Field
                label="RECO registration number"
                htmlFor="reco_registration_number"
              >
                <Input
                  id="reco_registration_number"
                  name="reco_registration_number"
                  required
                  defaultValue={profile.reco_registration_number ?? ""}
                />
              </Field>
              <Field
                label="Brokerage name"
                htmlFor="brokerage_name_submitted"
              >
                <Input
                  id="brokerage_name_submitted"
                  name="brokerage_name_submitted"
                  defaultValue={profile.brokerage_name ?? ""}
                />
              </Field>
              <Field label="Notes (optional)" htmlFor="notes">
                <Textarea id="notes" name="notes" />
              </Field>
              <Button type="submit">
                {status === "rejected" ? "Resubmit" : "Submit for verification"}
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
