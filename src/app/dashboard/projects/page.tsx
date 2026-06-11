import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand } from "@/lib/types";
import type { ProjectListItem } from "@/lib/types";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
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

  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const supabase = await createClient();
  let request = supabase
    .from("projects")
    .select(
      "id, slug, project_name, builder_name, city, sales_status, construction_status, occupancy_estimate_text, price_from_public, price_to_public, hero_image_url, record_status",
    )
    .order("created_at", { ascending: false })
    .limit(60);

  if (query) {
    request = request.or(
      `project_name.ilike.%${query}%,city.ilike.%${query}%,builder_name.ilike.%${query}%`,
    );
  }

  const { data } = await request;
  const projects = (data as ProjectListItem[] | null) ?? [];

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

      <form method="get" className="flex gap-2">
        <Input
          name="q"
          placeholder="Search by project, city, or builder…"
          defaultValue={query}
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {projects.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            {query
              ? `No projects match “${query}”.`
              : "No projects yet. Check back soon."}
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
                    <div className="flex items-center gap-2">
                      {p.sales_status ? (
                        <Badge tone="brand">
                          {p.sales_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      {p.record_status !== "published" ? (
                        <Badge tone="neutral">{p.record_status}</Badge>
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
