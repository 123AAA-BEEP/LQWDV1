import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Percent,
  Gift,
  LayoutGrid,
  ListChecks,
  ExternalLink,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { requireUserProfile, isApproved, isUltra } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { VerificationRequired } from "@/components/dashboard/locked";
import { UltraLock } from "@/components/dashboard/ultra";
import { formatPriceBand } from "@/lib/types";

export const metadata: Metadata = { title: "Project detail" };
export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { profile } = await requireUserProfile();
  const ultra = isUltra(profile);
  const { slug } = await params;

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
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) notFound();

  // Broker-only related data (RLS permits approved realtors to read).
  const [{ data: commercials }, { data: portals }, { data: incentives }, { data: floorplans }] =
    await Promise.all([
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
          <ButtonLink
            href={`/dashboard/projects/${slug}/update`}
            variant="secondary"
            size="sm"
          >
            Suggest an update
          </ButtonLink>
        </div>
      </div>

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
            <Section title="Overview" icon={FileText}>
              <p className="leading-relaxed text-slate-600">
                {project.description_long ?? project.description_short}
              </p>
            </Section>
          ) : null}

          {/* Broker-only: commercials */}
          <Section title="Commission &amp; negotiability" icon={Percent} brokerOnly>
            {commercials ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {commercials.commission_summary ? (
                  <Detail label="Commission" value={commercials.commission_summary} />
                ) : null}
                {commercials.commission_percent != null ? (
                  <Detail
                    label="Commission %"
                    value={`${commercials.commission_percent}%`}
                  />
                ) : null}
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
                {commercials.negotiability_notes ? (
                  <Detail
                    label="Notes"
                    value={commercials.negotiability_notes}
                    full
                  />
                ) : null}
              </dl>
            ) : (
              <Empty>No commission details on file.</Empty>
            )}
          </Section>

          {/* Broker-only: incentives */}
          <Section title="Incentives" icon={Gift} brokerOnly>
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
          <Section title="Floorplans" icon={LayoutGrid}>
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

          {/* Ultra-only: market intel. Locked teaser for non-Ultra members. */}
          {!ultra ? (
            <UltraLock
              title="Market intel is an Ultra feature"
              blurb="Price history, sales velocity, and comparable projects — the context that helps you advise clients with confidence."
            >
              <Card>
                <CardBody>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    <LineChart className="size-4 text-slate-400" strokeWidth={1.75} aria-hidden />
                    Market intel
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail label="Price / sq ft trend" value="▁▂▃▅▆▇ +6.4%" />
                    <Detail label="Sales velocity" value="34 units / month" />
                    <Detail label="Absorption" value="72% in 90 days" />
                    <Detail label="Comparable projects" value="5 nearby" />
                  </div>
                </CardBody>
              </Card>
            </UltraLock>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Section title="Key facts" icon={ListChecks}>
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

          <Section title="Broker portals" icon={ExternalLink} brokerOnly>
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
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  brokerOnly,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  brokerOnly?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {Icon ? (
              <Icon className="size-4 text-slate-400" strokeWidth={1.75} aria-hidden />
            ) : null}
            <span dangerouslySetInnerHTML={{ __html: title }} />
          </h2>
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
