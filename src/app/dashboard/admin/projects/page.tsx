import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";
import type { RecordStatus } from "@/lib/status";
import { ProjectsAdmin } from "./projects-admin";

export const metadata: Metadata = { title: "Manage projects" };
export const dynamic = "force-dynamic";
// Headroom for inline SEO generation on (bulk) publish.
export const maxDuration = 60;

const PAGE_SIZE = 100;
const SELECT =
  "id, slug, project_name, city, record_status, public_page_enabled, updated_at, public_project_pages(is_active)";

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

export default async function AdminProjects({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; limit?: string }>;
}) {
  const { q: rawQ, limit: rawLimit } = await searchParams;
  const q = (rawQ ?? "").trim();
  const limit = Math.min(
    5000,
    Math.max(PAGE_SIZE, Number(rawLimit) || PAGE_SIZE),
  );
  const filter = q
    ? `project_name.ilike.%${q}%,city.ilike.%${q}%,slug.ilike.%${q}%,builder_name.ilike.%${q}%`
    : null;

  const supabase = await createClient();

  let req = supabase
    .from("projects")
    .select(SELECT)
    .order("updated_at", { ascending: false })
    .limit(limit + 1); // +1 to detect whether more rows exist
  if (filter) req = req.or(filter);

  let countReq = supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  if (filter) countReq = countReq.or(filter);

  const [{ data }, { count }] = await Promise.all([req, countReq]);

  const all = (data as unknown as Row[]) ?? [];
  const hasMore = all.length > limit;
  const rows = hasMore ? all.slice(0, limit) : all;
  const total = count ?? rows.length;

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

  const moreParams = new URLSearchParams();
  if (q) moreParams.set("q", q);
  moreParams.set("limit", String(limit + PAGE_SIZE));

  return (
    <div className="space-y-4">
      <form method="get" className="flex gap-2">
        <Input
          name="q"
          placeholder="Search by project, city, builder, or slug…"
          defaultValue={q}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q ? (
          <ButtonLink href="/dashboard/admin/projects" variant="secondary">
            Clear
          </ButtonLink>
        ) : null}
      </form>

      <p className="text-xs text-slate-500">
        Showing {rows.length} of {total} project{total === 1 ? "" : "s"}
        {q ? ` matching “${q}”` : ""}.
      </p>

      <ProjectsAdmin rows={adminRows} searching={Boolean(q)} />

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <ButtonLink
            href={`?${moreParams.toString()}`}
            variant="secondary"
          >
            Load more
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
