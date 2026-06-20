import type { Metadata } from "next";
import Link from "next/link";
import { DoorOpen, ShieldCheck, ExternalLink } from "lucide-react";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Broker Portals" };
export const dynamic = "force-dynamic";

interface Portal {
  id: string;
  project_id: string;
  portal_name: string;
  portal_type: string;
  url: string | null;
  file_url: string | null;
  access_notes: string | null;
  is_primary: boolean;
}

const PORTAL_TYPE_LABEL: Record<string, string> = {
  external_url: "Website",
  drive_folder: "Drive",
  pdf: "PDF",
  internal_file: "File",
  login_page: "Login",
  other: "Portal",
};

export default async function BrokerPortals() {
  const { profile } = await requireUserProfile();
  const allowed = isApproved(profile) || isAdmin(profile);

  const groups: {
    projectId: string;
    name: string;
    slug: string | null;
    portals: Portal[];
  }[] = [];

  if (allowed) {
    const supabase = await createClient();
    const { data: portalRows } = await supabase
      .from("project_broker_portals")
      .select(
        "id, project_id, portal_name, portal_type, url, file_url, access_notes, is_primary",
      )
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(300);
    const portals = (portalRows as Portal[] | null) ?? [];

    if (portals.length) {
      const ids = Array.from(new Set(portals.map((p) => p.project_id)));
      // Base projects is admin-only; approved realtors read the broker view.
      const { data: projs } = await supabase
        .from("broker_projects_view")
        .select("id, project_name, slug")
        .in("id", ids);
      const byId = new Map(
        ((projs as { id: string; project_name: string; slug: string }[] | null) ??
          []).map((p) => [p.id, p]),
      );
      const grouped = new Map<string, Portal[]>();
      for (const p of portals) {
        const arr = grouped.get(p.project_id) ?? [];
        arr.push(p);
        grouped.set(p.project_id, arr);
      }
      for (const [projectId, ps] of grouped) {
        const proj = byId.get(projectId);
        if (!proj) continue; // not visible to this user
        groups.push({
          projectId,
          name: proj.project_name,
          slug: proj.slug,
          portals: ps,
        });
      }
      groups.sort((a, b) => a.name.localeCompare(b.name));
    }
  }

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
            work — no more hunting across inboxes and bookmarks.
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
      ) : groups.length === 0 ? (
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            No broker portals are available yet. As projects add their builder
            portals, they&rsquo;ll show up here.
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.projectId}>
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {g.slug ? (
                    <Link
                      href={`/dashboard/projects/${g.slug}`}
                      className="font-semibold text-brand-700 hover:underline"
                    >
                      {g.name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink">{g.name}</span>
                  )}
                </div>
                <ul className="divide-y divide-slate-100">
                  {g.portals.map((p) => {
                    const link = p.url ?? p.file_url;
                    return (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                            <span className="truncate">{p.portal_name}</span>
                            {p.is_primary ? (
                              <Badge tone="brand">Primary</Badge>
                            ) : null}
                          </p>
                          {p.access_notes ? (
                            <p className="truncate text-xs text-slate-400">
                              {p.access_notes}
                            </p>
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
                  })}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
