import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";
import { UPDATE_STATUS } from "@/lib/status";
import type { UpdateStatus } from "@/lib/status";
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

                {r.update_payload &&
                Object.keys(r.update_payload).length > 0 ? (
                  <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {JSON.stringify(r.update_payload, null, 2)}
                  </pre>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {r.project_id ? (
                    <Link
                      href={`/dashboard/admin/projects/${r.project_id}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Open project to apply changes →
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
