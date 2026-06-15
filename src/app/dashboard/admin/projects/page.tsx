import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { RecordStatus } from "@/lib/status";
import { ProjectsAdmin } from "./projects-admin";

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

  const adminRows = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    project_name: p.project_name,
    city: p.city,
    record_status: p.record_status,
    live:
      p.public_page_enabled &&
      p.record_status === "published" &&
      (p.public_project_pages?.[0]?.is_active ?? false),
  }));

  return <ProjectsAdmin rows={adminRows} />;
}
