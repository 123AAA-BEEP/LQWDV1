import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { UPDATE_STATUS } from "@/lib/status";
import type { UpdateStatus } from "@/lib/status";
import { formatFieldValue, type ProposedChange } from "@/lib/update-fields";
import { decideUpdate } from "./actions";

export const metadata: Metadata = { title: "Update requests" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  update_type: string;
  update_payload: Record<string, unknown> | null;
  status: UpdateStatus;
  admin_notes: string | null;
  created_at: string;
  project_id: string;
  submitter: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  project: { project_name: string; slug: string } | null;
}

export default async function UpdatesQueue() {
  const supabase = await createClient();
  const select =
    "id, update_type, update_payload, status, admin_notes, created_at, project_id, submitter:profiles!submitted_by_user_id(first_name,last_name,email), project:projects!project_id(project_name,slug)";

  const [{ data: open }, { data: decided }] = await Promise.all([
    supabase
      .from("property_update_requests")
      .select(select)
      .in("status", ["pending_review", "needs_changes"])
      .order("created_at", { ascending: true }),
    supabase
      .from("property_update_requests")
      .select(select)
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const openRows = (open as unknown as Row[]) ?? [];
  const decidedRows = (decided as unknown as Row[]) ?? [];

  // Resolve signed URLs for any image attachments (private bucket).
  const attachmentPaths = openRows.flatMap((r) =>
    Array.isArray(r.update_payload?.attachments)
      ? (r.update_payload!.attachments as string[])
      : [],
  );
  const signed: Record<string, string> = {};
  if (attachmentPaths.length > 0) {
    const { data: urls } = await supabase.storage
      .from("project-documents")
      .createSignedUrls(attachmentPaths, 3600);
    (urls ?? []).forEach((u) => {
      if (u.path && u.signedUrl) signed[u.path] = u.signedUrl;
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          To review ({openRows.length})
        </h2>
        {openRows.length === 0 ? (
          <Card>
            <CardBody className="text-center text-sm text-slate-500">
              No update requests are waiting for review.
            </CardBody>
          </Card>
        ) : (
          openRows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {r.project?.project_name ?? "Project"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.update_type} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <Badge tone={UPDATE_STATUS[r.status].tone}>
                    {UPDATE_STATUS[r.status].label}
                  </Badge>
                </div>

                <p className="text-xs text-slate-400">
                  From{" "}
                  {[r.submitter?.first_name, r.submitter?.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                    r.submitter?.email ||
                    "unknown"}
                </p>

                <RequestPayload payload={r.update_payload} signed={signed} />

                <div className="flex flex-wrap items-center gap-2">
                  {r.project_id ? (
                    <Link
                      href={`/dashboard/admin/projects/${r.project_id}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Open in project editor →
                    </Link>
                  ) : null}
                </div>

                <form
                  action={decideUpdate}
                  className="space-y-2 border-t border-slate-100 pt-3"
                >
                  <input type="hidden" name="request_id" value={r.id} />
                  <Textarea
                    name="admin_notes"
                    placeholder="Notes to the submitter (optional)…"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      name="status"
                      value="approved"
                      size="sm"
                    >
                      Approve
                    </Button>
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
                  <p className="text-sm font-medium text-slate-800">
                    {r.project?.project_name ?? "Project"}
                  </p>
                  <Badge tone={UPDATE_STATUS[r.status].tone}>
                    {UPDATE_STATUS[r.status].label}
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

/**
 * Renders an update request: the structured field diff (current → proposed) for
 * new requests, plus any note and image attachments. Falls back to the legacy
 * free-text `details` shape for older requests.
 */
function RequestPayload({
  payload,
  signed,
}: {
  payload: Record<string, unknown> | null;
  signed: Record<string, string>;
}) {
  const changes = Array.isArray(payload?.changes)
    ? (payload!.changes as ProposedChange[])
    : [];
  const note =
    typeof payload?.note === "string"
      ? payload.note
      : typeof payload?.details === "string"
        ? payload.details
        : null;
  const attachments = Array.isArray(payload?.attachments)
    ? (payload!.attachments as string[])
    : [];
  const imageKind =
    typeof payload?.image_kind === "string" ? payload.image_kind : null;

  if (changes.length === 0 && !note && attachments.length === 0) {
    return <p className="text-xs text-slate-400">No details provided.</p>;
  }

  return (
    <div className="space-y-3">
      {changes.length > 0 ? (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
          {changes.map((c) => (
            <li
              key={c.key}
              className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2 text-sm"
            >
              <span className="font-medium text-slate-700">{c.label}</span>
              <span className="text-slate-400 line-through">
                {formatFieldValue(c.type, c.from)}
              </span>
              <span aria-hidden className="text-brand-500">
                →
              </span>
              <span className="font-semibold text-ink">
                {formatFieldValue(c.type, c.to)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {note ? (
        <p className="whitespace-pre-wrap text-sm text-slate-600">{note}</p>
      ) : null}
      {attachments.length > 0 ? (
        <div className="space-y-1.5">
          {imageKind ? (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {imageKind.replace(/_/g, " ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {attachments.map((p) =>
              signed[p] ? (
                <a key={p} href={signed[p]} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={signed[p]}
                    alt="Attachment"
                    className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                  />
                </a>
              ) : (
                <span key={p} className="text-xs text-slate-400">
                  attachment unavailable
                </span>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
