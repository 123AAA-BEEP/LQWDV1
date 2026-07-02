import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand } from "@/lib/types";
import type { ProjectListItem } from "@/lib/types";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

const SALES_STATUS_OPTIONS = [
  { value: "coming_soon", label: "Coming soon" },
  { value: "selling", label: "Selling" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "completed", label: "Completed" },
];

const CONSTRUCTION_STATUS_OPTIONS = [
  { value: "preconstruction", label: "Preconstruction" },
  { value: "under_construction", label: "Under construction" },
  { value: "completed", label: "Completed" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    city?: string;
    sales_status?: string;
    construction_status?: string;
  }>;
}) {
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Projects
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const { q, city, sales_status, construction_status } = await searchParams;
  const query = (q ?? "").trim();
  const cityFilter = (city ?? "").trim();
  const salesFilter = sales_status ?? "";
  const constructionFilter = construction_status ?? "";

  const supabase = await createClient();

  // Realtors only browse vetted projects; admins see every record state so they
  // can find drafts / pending-review rows. Anything not approved or published
  // is internal-only and must not surface in the broker browse list.
  const VISIBLE_RECORD_STATUSES = ["approved", "published"];
  const restrictByStatus = !isAdmin(profile);

  // Fetch distinct cities for the city dropdown.
  let cityRequest = supabase
    .from("broker_projects_view")
    .select("city")
    .not("city", "is", null)
    .order("city", { ascending: true });
  if (restrictByStatus) {
    cityRequest = cityRequest.in("record_status", VISIBLE_RECORD_STATUSES);
  }
  const { data: cityRows } = await cityRequest;
  const cities = [...new Set((cityRows ?? []).map((r) => r.city as string))];

  let request = supabase
    .from("broker_projects_view")
    .select(
      "id, slug, project_name, builder_name, city, sales_status, construction_status, occupancy_estimate_text, price_from_public, price_to_public, hero_image_url, record_status, is_featured, featured_rank, created_at",
    )
    // Pinned (featured_rank) and featured projects lead the list for everyone,
    // then newest first — the same priority the public marketplace uses. The
    // featured cluster is capped to one grid row below (see FEATURED_AT_TOP).
    .order("featured_rank", { ascending: true, nullsFirst: false })
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (restrictByStatus) {
    request = request.in("record_status", VISIBLE_RECORD_STATUSES);
  }

  if (query) {
    request = request.or(
      `project_name.ilike.%${query}%,city.ilike.%${query}%,builder_name.ilike.%${query}%`,
    );
  }
  if (cityFilter) {
    request = request.eq("city", cityFilter);
  }
  if (salesFilter) {
    request = request.eq("sales_status", salesFilter);
  }
  if (constructionFilter) {
    request = request.eq("construction_status", constructionFilter);
  }

  const { data } = await request;
  const fetched = (data as ProjectListItem[] | null) ?? [];

  // Cap the featured cluster to a single grid row (3 on desktop). Extra featured
  // projects beyond the cap fall back into the list newest-first like any other
  // — so the top is always one clean row of pinned/featured projects, never a
  // ragged spill into the next row. `fetched` is already featured-first (by
  // rank, then newest), so the top featured rows are simply the leading slice.
  const FEATURED_AT_TOP = 3;
  const pinned = fetched.filter((p) => p.is_featured).slice(0, FEATURED_AT_TOP);
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const rest = fetched
    .filter((p) => !pinnedIds.has(p.id))
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  const projects = [...pinned, ...rest];

  // Which of these projects have an active broker portal (for the badge that
  // bridges Browse → the Broker Portals directory).
  let portalSet = new Set<string>();
  if (projects.length) {
    const { data: pp } = await supabase
      .from("project_broker_portals")
      .select("project_id")
      .eq("is_active", true)
      .in(
        "project_id",
        projects.map((p) => p.id),
      );
    portalSet = new Set(
      ((pp as { project_id: string }[] | null) ?? []).map((r) => r.project_id),
    );
  }

  const hasActiveFilter = query || cityFilter || salesFilter || constructionFilter;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Projects
        </h1>
        <p className="mt-1 text-slate-500">
          Active new-home projects. Open a project for broker-only details.
        </p>
      </div>

      <form method="get" className="space-y-3">
        <div className="flex gap-2">
          <Input
            name="q"
            aria-label="Search by project, city, or builder"
            placeholder="Search by project, city, or builder…"
            defaultValue={query}
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {hasActiveFilter ? (
            <Link href="/dashboard/projects">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="min-w-36 flex-1">
            <Select name="city" aria-label="City" defaultValue={cityFilter}>
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-44 flex-1">
            <Select
              name="sales_status"
              aria-label="Sales status"
              defaultValue={salesFilter}
            >
              <option value="">All sales statuses</option>
              {SALES_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-52 flex-1">
            <Select
              name="construction_status"
              aria-label="Construction status"
              defaultValue={constructionFilter}
            >
              <option value="">All construction statuses</option>
              {CONSTRUCTION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </form>

      {projects.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 text-center text-sm text-slate-500">
            <p>
              {hasActiveFilter
                ? "No projects match the selected filters."
                : "No projects yet. Check back soon."}
            </p>
            {hasActiveFilter ? (
              <Link
                href="/dashboard/projects"
                className="inline-block font-medium text-brand-700 hover:underline"
              >
                Clear filters and show everything →
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const band = formatPriceBand(p.price_from_public, p.price_to_public);
            return (
              <Link key={p.id} href={`/dashboard/projects/${p.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <div className="aspect-video overflow-hidden rounded-t-xl bg-slate-100">
                    {p.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.hero_image_url}
                        alt={p.project_name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <CardBody>
                    <div className="flex flex-wrap items-center gap-2">
                      {p.is_featured ? (
                        <Badge tone="featured">★ Featured</Badge>
                      ) : null}
                      {p.sales_status ? (
                        <Badge tone="brand" className="capitalize">
                          {p.sales_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {p.construction_status ? (
                        <Badge tone="neutral" className="capitalize">
                          {p.construction_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {/* Internal workflow state — meaningful to admins only. */}
                      {!restrictByStatus && p.record_status !== "published" ? (
                        <Badge tone="neutral" className="capitalize">
                          {p.record_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {portalSet.has(p.id) ? (
                        <Badge tone="brand">Portal</Badge>
                      ) : null}
                    </div>
                    <h2 className="mt-2 font-semibold text-ink">
                      {p.project_name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {[p.builder_name, p.city].filter(Boolean).join(" · ")}
                    </p>
                    {band ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {band}
                      </p>
                    ) : null}
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
