import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RECORD_STATUS } from "@/lib/status";
import type { RecordStatus } from "@/lib/status";

export const metadata: Metadata = { title: "Manage projects" };
export const dynamic = "force-dynamic";

interface Row {
  id: string;
  slug: string;
  project_name: string;
  city: string | null;
  record_status: RecordStatus;
  public_page_enabled: boolean;
  updated_at: string;
  public_project_pages: { is_active: boolean }[] | null;
}

export default async function AdminProjects() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, slug, project_name, city, record_status, public_page_enabled, updated_at, public_project_pages(is_active)",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  const rows = (data as unknown as Row[]) ?? [];

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No projects yet. Approve a submission to create the first canonical
            project.
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="divide-y divide-slate-100 p-0">
            {rows.map((p) => {
              const live =
                p.public_page_enabled &&
                p.record_status === "published" &&
                (p.public_project_pages?.[0]?.is_active ?? false);
              return (
                <Link
                  key={p.id}
                  href={`/dashboard/admin/projects/${p.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">
                      {p.project_name}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {p.city ?? "—"} · /{p.slug}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {live ? (
                      <Badge tone="success">Live</Badge>
                    ) : (
                      <Badge tone="neutral">Not public</Badge>
                    )}
                    <Badge tone={RECORD_STATUS[p.record_status].tone}>
                      {RECORD_STATUS[p.record_status].label}
                    </Badge>
                  </div>
                </Link>
              );
            })}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
