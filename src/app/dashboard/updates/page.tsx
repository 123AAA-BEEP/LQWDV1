import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { UPDATE_STATUS, updateTypeLabel } from "@/lib/status";
import type { UpdateStatus } from "@/lib/status";

export const metadata: Metadata = { title: "My update requests" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  update_type: string;
  update_payload: { details?: string; attachments?: string[] } | null;
  status: UpdateStatus;
  admin_notes: string | null;
  created_at: string;
  project: { project_name: string; slug: string } | null;
}

export default async function MyUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const { userId } = await requireUserProfile();

  const supabase = await createClient();
  const { data } = await supabase
    .from("property_update_requests")
    .select(
      "id, update_type, update_payload, status, admin_notes, created_at, project:projects!project_id(project_name,slug)",
    )
    .eq("submitted_by_user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (data as unknown as Row[]) ?? [];

  // Resolve signed URLs for any image attachments (private bucket).
  const attachmentPaths = rows.flatMap((r) => r.update_payload?.attachments ?? []);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          My update requests
        </h1>
        <p className="mt-1 text-slate-500">
          Track the changes you’ve suggested and their review status.
        </p>
      </div>

      {message === "submitted" ? (
        <Notice tone="success">
          Your update request was submitted. We’ll review it shortly.
        </Notice>
      ) : null}

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            You haven’t suggested any updates yet. Open a project and choose{" "}
            <Link
              href="/dashboard/projects"
              className="text-brand-700 hover:underline"
            >
              “Suggest an update”
            </Link>
            .
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardBody className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {r.project ? (
                        <Link
                          href={`/dashboard/projects/${r.project.slug}`}
                          className="hover:underline"
                        >
                          {r.project.project_name}
                        </Link>
                      ) : (
                        "Project"
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {updateTypeLabel(r.update_type)} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-CA")}
                    </p>
                  </div>
                  <Badge tone={UPDATE_STATUS[r.status].tone}>
                    {UPDATE_STATUS[r.status].label}
                  </Badge>
                </div>
                {r.update_payload?.details ? (
                  <p className="text-sm text-slate-600">
                    {r.update_payload.details}
                  </p>
                ) : null}
                {(r.update_payload?.attachments ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {(r.update_payload?.attachments ?? []).map((p) =>
                      signed[p] ? (
                        <a key={p} href={signed[p]} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={signed[p]}
                            alt="Attachment"
                            className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                          />
                        </a>
                      ) : null,
                    )}
                  </div>
                ) : null}
                {r.admin_notes ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Admin: {r.admin_notes}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
