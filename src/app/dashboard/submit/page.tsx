import type { Metadata } from "next";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/types";
import { submitProperty } from "./actions";

export const metadata: Metadata = { title: "Submit a project" };
export const dynamic = "force-dynamic";

const STATUS_TONE: Record<
  SubmissionStatus,
  "neutral" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  pending_review: "warning",
  needs_changes: "warning",
  approved: "success",
  rejected: "danger",
};

const STATUS_LABEL: Record<SubmissionStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  needs_changes: "Needs changes",
  approved: "Approved",
  rejected: "Rejected",
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  await requireUserProfile();

  const supabase = await createClient();
  const { data: submissions } = await supabase
    .from("property_submissions")
    .select("id, project_name, city, status, created_at, admin_notes")
    .order("created_at", { ascending: false })
    .limit(25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Submit a project
        </h1>
        <p className="mt-1 text-slate-500">
          Add a new project for the LIQWD team to review and publish.
        </p>
      </div>

      {message === "submitted" ? (
        <Notice tone="success">
          Submission received. We’ll review it and follow up.
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody>
          <form action={submitProperty} className="space-y-4">
            <Field label="Project name" htmlFor="project_name">
              <Input id="project_name" name="project_name" required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Builder / developer" htmlFor="builder_name">
                <Input id="builder_name" name="builder_name" />
              </Field>
              <Field label="City" htmlFor="city">
                <Input id="city" name="city" />
              </Field>
            </div>
            <Field label="Address" htmlFor="address_text">
              <Input id="address_text" name="address_text" />
            </Field>
            <Field
              label="Details"
              htmlFor="details"
              hint="Pricing, occupancy, broker portal links, anything useful for review."
            >
              <Textarea id="details" name="details" />
            </Field>
            <Button type="submit">Submit for review</Button>
          </form>
        </CardBody>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-ink">Your submissions</h2>
        {submissions && submissions.length > 0 ? (
          <div className="mt-3 space-y-2">
            {submissions.map((s) => (
              <Card key={s.id}>
                <CardBody className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {s.project_name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {s.city ?? "—"} ·{" "}
                      {new Date(s.created_at).toLocaleDateString("en-CA")}
                    </p>
                    {s.admin_notes ? (
                      <p className="mt-1 text-xs text-amber-700">
                        {s.admin_notes}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={STATUS_TONE[s.status as SubmissionStatus]}>
                    {STATUS_LABEL[s.status as SubmissionStatus]}
                  </Badge>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="mt-3">
            <CardBody className="text-center text-sm text-slate-500">
              You haven’t submitted any projects yet.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
