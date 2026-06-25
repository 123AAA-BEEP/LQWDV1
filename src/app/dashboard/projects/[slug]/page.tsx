import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand } from "@/lib/types";

export const metadata: Metadata = { title: "Project detail" };
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { userId, profile } = await requireUserProfile();
  const { slug } = await params;
  const { message } = await searchParams;

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Project
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const supabase = await createClient();
  // Broker-safe view: excludes private import/source provenance (admin-only).
  const { data: project } = await supabase
    .from("broker_projects_view")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) notFound();

  // Broker-only related data (RLS permits approved realtors to read).
  const [
    { data: commercials },
    { data: portals },
    { data: myPendingPortals },
    { data: incentives },
    { data: floorplans },
  ] = await Promise.all([
    supabase
      .from("project_private_commercials")
      .select("*")
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("project_broker_portals")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_active", true),
    // This realtor's own suggestions still awaiting admin review.
    supabase
      .from("project_broker_portals")
      .select("id, url, status")
      .eq("project_id", project.id)
      .eq("added_by_user_id", userId)
      .eq("status", "pending"),
    supabase.from("project_incentives").select("*").eq("project_id", project.id),
    supabase
      .from("project_floorplans")
      .select("*")
      .eq("project_id", project.id),
  ]);

  const band = formatPriceBand(
    project.price_from_public,
    project.price_to_public,
  );
  const location = [project.neighbourhood, project.city, project.province]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/projects"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {project.sales_status ? (
            <Badge tone="brand">
              {String(project.sales_status).replace(/_/g, " ")}
            </Badge>
          ) : null}
          {project.construction_status ? (
            <Badge tone="neutral">
              {String(project.construction_status).replace(/_/g, " ")}
            </Badge>
          ) : null}
          <Badge tone="neutral">{project.record_status}</Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              {project.project_name}
            </h1>
            <p className="text-slate-500">
              {[project.builder_name, location].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={`/dashboard/projects/${slug}/propose`} size="sm">
              Submit a proposal
            </ButtonLink>
            <ButtonLink
              href={`/dashboard/projects/${slug}/update`}
              variant="secondary"
              size="sm"
            >
              Suggest an update
            </ButtonLink>
          </div>
        </div>
      </div>

      {message === "portal-suggested" ? (
        <Notice tone="success">
          Thanks — your broker portal link was submitted for review. An admin
          will approve it before it appears in the directory.
        </Notice>
      ) : null}

      {project.hero_image_url ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={project.hero_image_url}
            alt={project.project_name}
            className="h-64 w-full object-cover"
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {project.description_long || project.description_short ? (
            <Section title="Overview">
              <p className="leading-relaxed text-slate-600">
                {project.description_long ?? project.description_short}
              </p>
            </Section>
          ) : null}

          {/* Broker-only: commercials */}
          <Section title="Commission &amp; negotiability" brokerOnly>
            {commercials ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                <Detail
                  label="Base commission"
                  value={
                    commercials.commission_summary ??
                    (commercials.commission_percent != null
                      ? `${commercials.commission_percent}%`
                      : "Unknown")
                  }
                />
                <Detail
                  label="Commission negotiable"
                  value={yesNo(commercials.commission_is_negotiable)}
                />
                <Detail
                  label="Price negotiable"
                  value={yesNo(commercials.price_is_negotiable)}
                />
                <Detail
                  label="Incentives negotiable"
                  value={yesNo(commercials.incentives_are_negotiable)}
                />
                {commercials.private_incentive_notes ? (
                  <Detail
                    label="Incentive notes"
                    value={commercials.private_incentive_notes}
                    full
                  />
                ) : null}
              </dl>
            ) : (
              <Empty>No commission details on file.</Empty>
            )}
          </Section>

          {/* Broker-only: incentives */}
          <Section title="Incentives" brokerOnly>
            {incentives && incentives.length > 0 ? (
              <ul className="space-y-3">
                {incentives.map((inc) => (
                  <li
                    key={inc.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <p className="font-medium text-slate-800">{inc.title}</p>
                    {inc.description_public ? (
                      <p className="text-sm text-slate-600">
                        {inc.description_public}
                      </p>
                    ) : null}
                    {inc.description_private ? (
                      <p className="mt-1 text-sm text-amber-700">
                        Private: {inc.description_private}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No incentives listed.</Empty>
            )}
          </Section>

          {/* Floorplans */}
          <Section title="Floorplans">
            {floorplans && floorplans.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-400">
                    <tr>
                      <th className="py-2 font-medium">Plan</th>
                      <th className="py-2 font-medium">Type</th>
                      <th className="py-2 font-medium">Size</th>
                      <th className="py-2 font-medium">Public</th>
                      <th className="py-2 font-medium">Internal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {floorplans.map((fp) => (
                      <tr key={fp.id} className="border-t border-slate-100">
                        <td className="py-2">{fp.plan_name ?? "—"}</td>
                        <td className="py-2">{fp.unit_type ?? "—"}</td>
                        <td className="py-2">
                          {fp.sqft_interior ? `${fp.sqft_interior} sq ft` : "—"}
                        </td>
                        <td className="py-2">
                          {fp.price_public
                            ? formatPriceBand(fp.price_public, null)
                            : "—"}
                        </td>
                        <td className="py-2 text-amber-700">
                          {fp.price_internal
                            ? formatPriceBand(fp.price_internal, null)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty>No floorplans listed.</Empty>
            )}
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title="Key facts">
            <dl className="space-y-2 text-sm">
              {band ? <Detail label="Pricing" value={band} /> : null}
              {project.occupancy_estimate_text ? (
                <Detail
                  label="Occupancy"
                  value={project.occupancy_estimate_text}
                />
              ) : null}
              {project.total_units ? (
                <Detail label="Units" value={String(project.total_units)} />
              ) : null}
              {project.storeys ? (
                <Detail label="Storeys" value={String(project.storeys)} />
              ) : null}
            </dl>
          </Section>

          <Section title="Broker portals" brokerOnly>
            {portals && portals.length > 0 ? (
              <ul className="space-y-2">
                {portals.map((portal) => (
                  <li key={portal.id}>
                    <a
                      href={portal.url ?? portal.file_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      {portal.portal_name}
                    </a>
                    {portal.access_notes ? (
                      <p className="text-xs text-slate-500">
                        {portal.access_notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No broker portals on file.</Empty>
            )}

            {myPendingPortals && myPendingPortals.length > 0 ? (
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {myPendingPortals.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 text-xs text-slate-500"
                  >
                    <span className="truncate">{p.url}</span>
                    <Badge tone="warning">Pending review</Badge>
                  </li>
                ))}
              </ul>
            ) : null}

            <ButtonLink
              href={`/dashboard/projects/${slug}/broker-portal`}
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
            >
              Suggest a broker portal
            </ButtonLink>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  brokerOnly,
}: {
  title: string;
  children: React.ReactNode;
  brokerOnly?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h2
            className="text-sm font-semibold uppercase tracking-wide text-slate-500"
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {brokerOnly ? <Badge tone="warning">Broker-only</Badge> : null}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

function Detail({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-800">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400">{children}</p>;
}

function yesNo(v: boolean | null) {
  if (v === null || v === undefined) return "Unknown";
  return v ? "Yes" : "No";
}
