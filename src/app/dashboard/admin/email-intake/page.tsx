import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { unpublishIntakeProject } from "./actions";

export const metadata: Metadata = { title: "Email intake" };
export const dynamic = "force-dynamic";

type Action = "created" | "updated" | "draft" | "skipped" | "error" | "pending";

interface Row {
  id: string;
  received_at: string;
  from_email: string | null;
  subject: string | null;
  action: Action;
  project_id: string | null;
  published: boolean;
  confidence: number | null;
  notes: string | null;
}

const TONE: Record<Action, "neutral" | "success" | "warning" | "danger" | "brand"> = {
  created: "success",
  updated: "brand",
  draft: "warning",
  skipped: "neutral",
  error: "danger",
  pending: "neutral",
};

export default async function EmailIntakePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_intake_log")
    .select(
      "id, received_at, from_email, subject, action, project_id, published, confidence, notes",
    )
    .order("received_at", { ascending: false })
    .limit(100);
  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Email intake ({rows.length})
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Developer marketing emails forwarded to the intake inbox are parsed by
          AI into created or updated projects. High-confidence new projects
          auto-publish; lower-confidence ones land as drafts. Use{" "}
          <span className="font-medium">Unpublish</span> to instantly pull an
          auto-published project back to draft.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No emails processed yet.
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((r) => (
              <div key={r.id} className="space-y-1.5 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone={TONE[r.action]} className="capitalize">
                      {r.action}
                    </Badge>
                    {r.published ? <Badge tone="success">Live</Badge> : null}
                    {r.confidence != null ? (
                      <span className="text-xs text-slate-500">
                        conf {r.confidence.toFixed(2)}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(r.received_at).toLocaleString("en-CA")}
                  </span>
                </div>
                <p className="truncate text-sm font-medium text-slate-800">
                  {r.subject || "(no subject)"}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {r.from_email ?? "unknown sender"}
                  {r.notes ? ` · ${r.notes}` : ""}
                </p>
                {r.project_id ? (
                  <div className="flex items-center gap-3 pt-1">
                    <Link
                      href={`/dashboard/admin/projects/${r.project_id}`}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Open project
                    </Link>
                    {r.published ? (
                      <form action={unpublishIntakeProject}>
                        <input type="hidden" name="project_id" value={r.project_id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Unpublish
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
