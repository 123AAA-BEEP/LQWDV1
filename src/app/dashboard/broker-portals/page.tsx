import type { Metadata } from "next";
import Link from "next/link";
import {
  DoorOpen,
  ShieldCheck,
  ExternalLink,
  Star,
} from "lucide-react";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Broker Portals" };
export const dynamic = "force-dynamic";

interface Proj {
  id: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  slug: string | null;
}
interface PortalRow {
  id: string;
  project_id: string;
  portal_name: string;
  portal_type: string;
  url: string | null;
  file_url: string | null;
  access_notes: string | null;
  is_primary: boolean;
  is_featured: boolean;
}
type Portal = PortalRow & { project: Proj };

const PORTAL_TYPE_LABEL: Record<string, string> = {
  external_url: "Website",
  drive_folder: "Drive",
  pdf: "PDF",
  internal_file: "File",
  login_page: "Login",
  other: "Portal",
};

const TYPE_OPTIONS = [
  { value: "external_url", label: "Website" },
  { value: "login_page", label: "Login" },
  { value: "drive_folder", label: "Drive" },
  { value: "pdf", label: "PDF" },
  { value: "internal_file", label: "File" },
  { value: "other", label: "Other" },
];

function portalLink(p: PortalRow): string | null {
  return p.url ?? p.file_url;
}

function PortalRowItem({ p }: { p: Portal }) {
  const link = portalLink(p);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <span className="truncate">{p.portal_name}</span>
          {p.is_primary ? <Badge tone="brand">Primary</Badge> : null}
        </p>
        {p.access_notes ? (
          <p className="truncate text-xs text-slate-400">{p.access_notes}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone="neutral">
          {PORTAL_TYPE_LABEL[p.portal_type] ?? p.portal_type}
        </Badge>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
          >
            Open <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </li>
  );
}

export default async function BrokerPortals({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; type?: string }>;
}) {
  const { profile } = await requireUserProfile();
  const allowed = isApproved(profile) || isAdmin(profile);
  const { q, city, type } = await searchParams;
  const query = (q ?? "").trim();
  const cityFilter = (city ?? "").trim();
  const typeFilter = (type ?? "").trim();

  let cities: string[] = [];
  let featured: Portal[] = [];
  let groups: { project: Proj; portals: Portal[] }[] = [];

  if (allowed) {
    const supabase = await createClient();
    // Only PUBLISHED projects surface portals — so a link goes live the moment
    // its project is published. Base projects is admin-only → use the broker view.
    const { data: projRows } = await supabase
      .from("broker_projects_view")
      .select("id, project_name, builder_name, city, slug")
      .eq("record_status", "published")
      .limit(400);
    const projects = (projRows as Proj[] | null) ?? [];
    const projMap = new Map(projects.map((p) => [p.id, p]));
    cities = [
      ...new Set(projects.map((p) => p.city).filter((c): c is string => !!c)),
    ].sort();

    let portals: Portal[] = [];
    if (projects.length) {
      const { data: portalRows } = await supabase
        .from("project_broker_portals")
        .select(
          "id, project_id, portal_name, portal_type, url, file_url, access_notes, is_primary, is_featured",
        )
        .eq("is_active", true)
        .in(
          "project_id",
          projects.map((p) => p.id),
        )
        .limit(400);
      portals = ((portalRows as PortalRow[] | null) ?? [])
        .map((p) => ({ ...p, project: projMap.get(p.project_id) }))
        .filter((p): p is Portal => !!p.project);
    }

    // Featured = paid placement, pinned at top regardless of filters.
    featured = portals.filter((p) => p.is_featured);
    const featuredIds = new Set(featured.map((p) => p.id));

    const ql = query.toLowerCase();
    const list = portals.filter((p) => {
      if (featuredIds.has(p.id)) return false;
      if (typeFilter && p.portal_type !== typeFilter) return false;
      if (cityFilter && p.project.city !== cityFilter) return false;
      if (ql) {
        const hay = [
          p.portal_name,
          p.project.project_name,
          p.project.builder_name,
          p.project.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });

    const byProject = new Map<string, Portal[]>();
    for (const p of list) {
      const arr = byProject.get(p.project_id) ?? [];
      arr.push(p);
      byProject.set(p.project_id, arr);
    }
    groups = [...byProject.entries()]
      .map(([, ps]) => ({ project: ps[0].project, portals: ps }))
      .sort((a, b) => a.project.project_name.localeCompare(b.project.project_name));
  }

  const hasFilter = query || cityFilter || typeFilter;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white">
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <DoorOpen className="size-3" strokeWidth={2} aria-hidden /> Broker
            Portals
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
            Every broker portal, in one place
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Builder portals, price lists, and worksheets for the projects you
            work — search, filter, and jump straight in.
          </p>
        </div>
      </div>

      {!allowed ? (
        <Card>
          <CardBody className="flex flex-col items-start gap-3 text-sm text-slate-600">
            <ShieldCheck className="size-6 text-slate-400" aria-hidden />
            <p>Get verified to unlock broker portal access.</p>
            <ButtonLink href="/dashboard/verify">Start verification</ButtonLink>
          </CardBody>
        </Card>
      ) : (
        <>
          <form method="get" className="space-y-3">
            <div className="flex gap-2">
              <Input
                name="q"
                placeholder="Search by project, builder, or portal…"
                defaultValue={query}
                className="flex-1"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
              {hasFilter ? (
                <Link href="/dashboard/broker-portals">
                  <Button type="button" variant="secondary">
                    Clear
                  </Button>
                </Link>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="min-w-36 flex-1">
                <Select name="city" defaultValue={cityFilter}>
                  <option value="">All cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-36 flex-1">
                <Select name="type" defaultValue={typeFilter}>
                  <option value="">All types</option>
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </form>

          {/* Featured — paid placement, pinned on top. */}
          {featured.length > 0 ? (
            <div className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                <Star className="size-3.5" aria-hidden /> Featured
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {featured.map((p) => {
                  const link = portalLink(p);
                  return (
                    <Card
                      key={p.id}
                      className="border-amber-200 bg-amber-50/40 ring-1 ring-amber-100"
                    >
                      <CardBody className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-ink">
                            {p.portal_name}
                          </span>
                          <Badge tone="warning">Sponsored</Badge>
                        </div>
                        <p className="truncate text-sm text-slate-500">
                          {p.project.project_name}
                          {p.project.city ? ` · ${p.project.city}` : ""}
                        </p>
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 pt-1 text-sm font-medium text-brand-700 hover:underline"
                          >
                            Open portal{" "}
                            <ExternalLink className="size-3.5" aria-hidden />
                          </a>
                        ) : null}
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : null}

          {groups.length === 0 ? (
            <Card>
              <CardBody className="text-center text-sm text-slate-500">
                {hasFilter
                  ? "No portals match your search."
                  : "No broker portals are available yet. As published projects add their builder portals, they'll show up here."}
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map((g) => (
                <Card key={g.project.id}>
                  <CardBody className="space-y-2">
                    {g.project.slug ? (
                      <Link
                        href={`/dashboard/projects/${g.project.slug}`}
                        className="font-semibold text-brand-700 hover:underline"
                      >
                        {g.project.project_name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink">
                        {g.project.project_name}
                      </span>
                    )}
                    <ul className="divide-y divide-slate-100">
                      {g.portals.map((p) => (
                        <PortalRowItem key={p.id} p={p} />
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
