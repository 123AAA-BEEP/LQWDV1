import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { SUBMISSION_STATUS } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/status";
import { approveSubmission, setSubmissionStatus } from "./actions";

export const metadata: Metadata = { title: "Submission queue" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  address_text: string | null;
  submission_payload: { details?: string } | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  created_at: string;
  project_id: string | null;
  submitter: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export default async function SubmissionsQueue() {
  const supabase = await createClient();
  const select =
    "id, project_name, builder_name, city, address_text, submission_payload, status, admin_notes, created_at, project_id, submitter:profiles!submitted_by_user_id(first_name,last_name,email)";

  const [{ data: open }, { data: decided }] = await Promise.all([
    supabase
      .from("property_submissions")
      .select(select)
      .in("status", ["pending_review", "needs_changes"])
      .order("created_at", { ascending: true }),
    supabase
      .from("property_submissions")
      .select(select)
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const openRows = (open as unknown as Row[]) ?? [];
  const decidedRows = (decided as unknown as Row[]) ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          To review ({openRows.length})
        </h2>
        {openRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No submissions are waiting for review.
            </CardBody>
          </Card>
        ) : (
          openRows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {r.project_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {[r.builder_name, r.city].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                  </div>
                  <Badge tone={SUBMISSION_STATUS[r.status].tone}>
                    {SUBMISSION_STATUS[r.status].label}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400">
                  Submitted by{" "}
                  {[r.submitter?.first_name, r.submitter?.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                    r.submitter?.email ||
                    "unknown"}{" "}
                  · {new Date(r.created_at).toLocaleDateString("en-CA")}
                </p>

                {r.address_text ? (
                  <p className="text-sm text-slate-600">{r.address_text}</p>
                ) : null}
                {r.submission_payload?.details ? (
                  <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                    {r.submission_payload.details}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-end gap-2">
                  <form action={approveSubmission}>
                    <input type="hidden" name="submission_id" value={r.id} />
                    <Button type="submit" size="sm">
                      Approve &amp; create project
                    </Button>
                  </form>
                </div>

                <form
                  action={setSubmissionStatus}
                  className="space-y-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="submission_id" value={r.id} />
                  <Textarea
                    name="admin_notes"
                    placeholder="Notes to the submitter (optional)…"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      name="status"
                      value="needs_changes"
                      size="sm"
                      variant="secondary"
                    >
                      Request changes
                    </Button>
                    <Button
                      type="submit"
                      name="status"
                      value="rejected"
                      size="sm"
                      variant="danger"
                    >
                      Reject
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ))
        )}
      </section>

      {decidedRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Recently decided
          </h2>
          <Card>
            <CardBody className="divide-y divide-slate-100 p-0">
              {decidedRows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {r.project_name}
                    </p>
                    {r.project_id ? (
                      <Link
                        href={`/dashboard/admin/projects/${r.project_id}`}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        Open project →
                      </Link>
                    ) : null}
                  </div>
                  <Badge tone={SUBMISSION_STATUS[r.status].tone}>
                    {SUBMISSION_STATUS[r.status].label}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
