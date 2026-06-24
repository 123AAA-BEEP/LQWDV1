import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Media candidates" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  project_id: string;
  image_url: string;
  source_title: string | null;
  source_url: string | null;
  provider: string;
  width: number | null;
  height: number | null;
  created_at: string;
  project: { project_name: string | null } | null;
}

export default async function MediaCandidatesQueue() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_media_candidates")
    .select(
      "id, project_id, image_url, source_title, source_url, provider, width, height, created_at, project:projects!project_id(project_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(60);

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Pending media candidates ({rows.length})
      </h2>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No media candidates are awaiting review.
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              {/* Candidate images are arbitrary external URLs, so a plain img
                  avoids next/image remote-domain configuration. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={r.image_url}
                alt={r.source_title ?? "Media candidate"}
                className="h-40 w-full bg-slate-100 object-cover"
              />
              <CardBody className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/admin/projects/${r.project_id}`}
                    className="truncate text-sm font-medium text-brand-700 hover:underline"
                  >
                    {r.project?.project_name ?? "Open project"} →
                  </Link>
                  <Badge tone="neutral">{r.provider}</Badge>
                </div>
                {r.source_title ? (
                  <p className="truncate text-xs text-slate-500">
                    {r.source_title}
                  </p>
                ) : null}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    {r.width && r.height ? `${r.width}×${r.height}` : "—"}
                  </span>
                  {r.source_url ? (
                    <a
                      href={r.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      Source ↗
                    </a>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
