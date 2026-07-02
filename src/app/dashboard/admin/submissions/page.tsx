import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlashNotice } from "@/components/ui/flash-notice";
import { Notice } from "@/components/ui/notice";
import { Textarea } from "@/components/ui/field";
import { SUBMISSION_STATUS } from "@/lib/status";
import type { SubmissionStatus } from "@/lib/status";
import { findExistingProjectFuzzy } from "@/lib/projects-dedup";
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

/** The existing project a submission appears to be about (dedup at review time). */
interface Existing {
  id: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  address_full: string | null;
  record_status: string;
  matched_by: "exact" | "fuzzy";
}

const SELECT =
  "id, project_name, builder_name, city, address_text, submission_payload, status, admin_notes, created_at, project_id, submitter:profiles!submitted_by_user_id(first_name,last_name,email)";

function fullName(s: Row["submitter"]): string {
  return (
    [s?.first_name, s?.last_name].filter(Boolean).join(" ") ||
    s?.email ||
    "unknown"
  );
}

/** One labelled value in the "what was submitted" grid. */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-slate-700">{value?.trim() || "—"}</dd>
    </div>
  );
}

/** One row of the existing-vs-submitted comparison. */
function DiffRow({
  label,
  current,
  incoming,
}: {
  label: string;
  current: string | null;
  incoming: string | null;
}) {
  const cur = (current ?? "").trim();
  const inc = (incoming ?? "").trim();
  let tag: { text: string; cls: string } | null = null;
  if (inc && !cur) tag = { text: "adds", cls: "bg-emerald-100 text-emerald-700" };
  else if (inc && cur && inc.toLowerCase() !== cur.toLowerCase())
    tag = { text: "changes", cls: "bg-amber-100 text-amber-700" };

  return (
    <div className="grid grid-cols-[7rem,1fr] gap-x-3 gap-y-0.5 py-2 sm:grid-cols-[8rem,1fr,1fr]">
      <div className="row-span-2 sm:row-span-1">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
        {tag ? (
          <span
            className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tag.cls}`}
          >
            {tag.text}
          </span>
        ) : null}
      </div>
      <div className="text-sm">
        <span className="text-[10px] uppercase text-slate-400 sm:hidden">
          Current:{" "}
        </span>
        <span className={cur ? "text-slate-500 line-through decoration-slate-300" : "text-slate-400"}>
          {cur || "—"}
        </span>
      </div>
      <div className="text-sm">
        <span className="text-[10px] uppercase text-slate-400 sm:hidden">
          Submitted:{" "}
        </span>
        <span className={tag ? "font-medium text-slate-800" : "text-slate-500"}>
          {inc || "—"}
        </span>
      </div>
    </div>
  );
}

export default async function SubmissionsQueue({
  searchParams,
}: {
  searchParams: Promise<{ flash?: string; flash_tone?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: open }, { data: decided }] = await Promise.all([
    supabase
      .from("property_submissions")
      .select(SELECT)
      .in("status", ["pending_review", "needs_changes"])
      .order("created_at", { ascending: true }),
    supabase
      .from("property_submissions")
      .select(SELECT)
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const openRows = (open as unknown as Row[]) ?? [];
  const decidedRows = (decided as unknown as Row[]) ?? [];

  // For each open submission, detect whether it matches an existing project
  // (the same dedup the approve step uses), so the admin sees New vs Update and,
  // when it's an update, exactly what the submission would change.
  const matches = await Promise.all(
    openRows.map(async (r): Promise<Existing | null> => {
      const m = await findExistingProjectFuzzy(supabase, r.project_name, r.city);
      if (!m) return null;
      const { data } = await supabase
        .from("projects")
        .select("id, project_name, builder_name, city, address_full, record_status")
        .eq("id", m.id)
        .maybeSingle();
      if (!data) return null;
      return { ...(data as Omit<Existing, "matched_by">), matched_by: m.matched_by };
    }),
  );

  return (
    <div className="space-y-8">
      <FlashNotice searchParams={sp} />
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
          openRows.map((r, i) => {
            const existing = matches[i];
            const details = r.submission_payload?.details?.trim();
            return (
              <Card key={r.id}>
                <CardBody className="space-y-4">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-slate-800">
                        {r.project_name}
                      </p>
                      <p className="text-xs text-slate-400">
                        Submitted by {fullName(r.submitter)} ·{" "}
                        {new Date(r.created_at).toLocaleDateString("en-CA")}
                        {r.submitter?.email ? ` · ${r.submitter.email}` : ""}
                      </p>
                    </div>
                    <Badge tone={SUBMISSION_STATUS[r.status].tone}>
                      {SUBMISSION_STATUS[r.status].label}
                    </Badge>
                  </div>

                  {/* New vs. update banner */}
                  {existing ? (
                    <Notice tone="warning">
                      <span className="font-semibold">
                        Likely an update to an existing project
                      </span>{" "}
                      ({existing.matched_by === "exact" ? "exact" : "fuzzy"} name +
                      city match). Approving will merge into it — no duplicate is
                      created.
                      <div className="mt-1">
                        <Link
                          href={`/dashboard/admin/projects/${existing.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {existing.project_name}
                        </Link>{" "}
                        <span className="text-xs text-slate-500">
                          ({existing.record_status})
                        </span>
                      </div>
                    </Notice>
                  ) : (
                    <Notice tone="success">
                      <span className="font-semibold">New project.</span> No
                      existing match — approving creates a new draft project.
                    </Notice>
                  )}

                  {/* What was submitted */}
                  {existing ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        What this changes
                      </p>
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 px-3">
                        <div className="hidden grid-cols-[8rem,1fr,1fr] gap-x-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid">
                          <span>Field</span>
                          <span>Current</span>
                          <span>Submitted</span>
                        </div>
                        <DiffRow label="Name" current={existing.project_name} incoming={r.project_name} />
                        <DiffRow label="Builder" current={existing.builder_name} incoming={r.builder_name} />
                        <DiffRow label="City" current={existing.city} incoming={r.city} />
                        <DiffRow label="Address" current={existing.address_full} incoming={r.address_text} />
                      </div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-4">
                      <Field label="Name" value={r.project_name} />
                      <Field label="Builder" value={r.builder_name} />
                      <Field label="City" value={r.city} />
                      <Field label="Address" value={r.address_text} />
                    </dl>
                  )}

                  {details ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Notes from submitter
                      </p>
                      <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                        {details}
                      </p>
                    </div>
                  ) : null}

                  {r.admin_notes ? (
                    <p className="text-xs text-slate-500">
                      <span className="font-medium">Admin note:</span>{" "}
                      {r.admin_notes}
                    </p>
                  ) : null}

                  {/* Actions */}
                  <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                    <form action={approveSubmission}>
                      <input type="hidden" name="submission_id" value={r.id} />
                      <Button type="submit" size="sm">
                        {existing ? "Approve & merge into project" : "Approve & create project"}
                      </Button>
                    </form>
                  </div>

                  <form action={setSubmissionStatus} className="space-y-2">
                    <input type="hidden" name="submission_id" value={r.id} />
                    <Textarea
                      name="admin_notes"
                      placeholder="Notes to the submitter (optional)…"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" name="status" value="needs_changes" size="sm" variant="secondary">
                        Request changes
                      </Button>
                      <Button type="submit" name="status" value="rejected" size="sm" variant="danger">
                        Reject
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            );
          })
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
                <div key={r.id} className="flex items-center justify-between px-5 py-3">
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
