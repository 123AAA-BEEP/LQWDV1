import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { LEAD_STATUSES, LEAD_STATUS_META, leadStatusMeta } from "@/lib/leads";
import { setLeadStatus, pullLeadToAdmin } from "./actions";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  project_id: string | null;
  assigned_realtor_profile_id: string | null;
  referred_by_profile_id: string | null;
  lead_name: string;
  lead_email: string;
  lead_phone: string | null;
  message: string | null;
  is_realtor: boolean | null;
  status: string | null;
  created_at: string;
}
interface Project {
  id: string;
  project_name: string;
  slug: string;
}
interface Prof {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

function profName(p: Prof | undefined): string {
  if (!p) return "Unknown agent";
  return [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Agent";
}

const VIEWS = [
  { value: "", label: "All" },
  { value: "pool", label: "Admin pool" },
  { value: "assigned", label: "With an agent" },
] as const;

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const { view: rawView, q: rawQ } = await searchParams;
  const view = ["pool", "assigned"].includes(rawView ?? "") ? rawView! : "";
  const q = (rawQ ?? "").trim().toLowerCase();

  const supabase = await createClient();

  // Admin RLS returns every lead. (Realtors only ever see their own.)
  const { data: leadData } = await supabase
    .from("project_leads")
    .select(
      "id, project_id, assigned_realtor_profile_id, referred_by_profile_id, lead_name, lead_email, lead_phone, message, is_realtor, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  const allLeads = (leadData as Lead[] | null) ?? [];

  // Resolve projects + agent profiles in batch (robust, no fragile embeds).
  const projectIds = [...new Set(allLeads.map((l) => l.project_id).filter(Boolean))] as string[];
  const profileIds = [
    ...new Set(
      allLeads
        .flatMap((l) => [l.assigned_realtor_profile_id, l.referred_by_profile_id])
        .filter(Boolean),
    ),
  ] as string[];

  const [{ data: projData }, { data: profData }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id, project_name, slug").in("id", projectIds)
      : Promise.resolve({ data: [] as Project[] }),
    profileIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, email, phone").in("id", profileIds)
      : Promise.resolve({ data: [] as Prof[] }),
  ]);
  const projById = new Map((projData as Project[] | null ?? []).map((p) => [p.id, p]));
  const profById = new Map((profData as Prof[] | null ?? []).map((p) => [p.id, p]));

  // Counts (over everything, before filters).
  const total = allLeads.length;
  const poolCount = allLeads.filter((l) => !l.assigned_realtor_profile_id).length;
  const assignedCount = total - poolCount;
  const newCount = allLeads.filter((l) => (l.status ?? "new") === "new").length;

  // Apply filters.
  const leads = allLeads.filter((l) => {
    if (view === "pool" && l.assigned_realtor_profile_id) return false;
    if (view === "assigned" && !l.assigned_realtor_profile_id) return false;
    if (q) {
      const hay = `${l.lead_name} ${l.lead_email} ${l.lead_phone ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const chipHref = (v: string) => {
    const p = new URLSearchParams();
    if (v) p.set("view", v);
    if (rawQ) p.set("q", rawQ);
    const s = p.toString();
    return s ? `/dashboard/admin/leads?${s}` : "/dashboard/admin/leads";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-ink">Leads</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every buyer who registered on a public project page. Leads route to the
          agent who has claimed that page; anything unclaimed sits in the
          <span className="font-medium"> admin pool — those are LIQWD&apos;s</span>.
          You can contact any lead directly.
        </p>
      </div>

      {/* Breakdown of who has the claim */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Total leads" value={total} />
        <Stat label="Admin pool (LIQWD)" value={poolCount} accent="amber" />
        <Stat label="Claimed by an agent" value={assignedCount} />
        <Stat label="New / unworked" value={newCount} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((v) => {
            const active = view === v.value;
            const n = v.value === "pool" ? poolCount : v.value === "assigned" ? assignedCount : total;
            return (
              <Link
                key={v.value || "all"}
                href={chipHref(v.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {v.label}
                <span className={cn("ml-1.5", active ? "text-white/80" : "text-slate-400")}>{n}</span>
              </Link>
            );
          })}
        </div>
        <form method="get" className="flex flex-1 gap-2 sm:max-w-xs">
          {view ? <input type="hidden" name="view" value={view} /> : null}
          <Input name="q" placeholder="Search name, email, phone…" defaultValue={rawQ ?? ""} className="flex-1" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>
      </div>

      {leads.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-500">
            {q || view ? "No leads match your filters." : "No leads yet."}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const project = l.project_id ? projById.get(l.project_id) : undefined;
            const assigned = l.assigned_realtor_profile_id
              ? profById.get(l.assigned_realtor_profile_id)
              : undefined;
            const sm = leadStatusMeta(l.status);
            const claimTag = l.assigned_realtor_profile_id
              ? l.referred_by_profile_id
                ? "via referral link"
                : "page steward"
              : null;

            return (
              <Card key={l.id}>
                <CardBody className="space-y-3">
                  {/* Top line: name + status */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {l.lead_name}
                        {l.is_realtor ? (
                          <Badge tone="brand" className="ml-2 align-middle">
                            Agent — recruit
                          </Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(l.created_at).toLocaleString("en-CA")}
                        {project ? (
                          <>
                            {" · "}
                            <Link
                              href={`/dashboard/admin/projects/${project.id}`}
                              className="text-brand-700 hover:underline"
                            >
                              {project.project_name}
                            </Link>{" "}
                            <a
                              href={`/projects/${project.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:underline"
                            >
                              (public page ↗)
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <Badge tone={sm.tone}>{sm.label}</Badge>
                  </div>

                  {/* Contact the lead */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm">
                    <a href={`mailto:${l.lead_email}`} className="font-medium text-brand-700 hover:underline">
                      {l.lead_email}
                    </a>
                    {l.lead_phone ? (
                      <a href={`tel:${l.lead_phone}`} className="font-medium text-brand-700 hover:underline">
                        {l.lead_phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">No phone</span>
                    )}
                  </div>

                  {l.message ? (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{l.message}</p>
                  ) : null}

                  {/* Who has the claim */}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Claim
                    </span>
                    {assigned ? (
                      <>
                        <Badge tone="neutral">{profName(assigned)}</Badge>
                        {claimTag ? <span className="text-xs text-slate-400">{claimTag}</span> : null}
                        {assigned.email ? (
                          <a href={`mailto:${assigned.email}`} className="text-xs text-slate-500 hover:underline">
                            {assigned.email}
                          </a>
                        ) : null}
                      </>
                    ) : (
                      <Badge tone="warning">Admin pool · LIQWD</Badge>
                    )}
                  </div>

                  {/* Admin controls */}
                  <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
                    <form action={setLeadStatus} className="flex items-end gap-2">
                      <input type="hidden" name="lead_id" value={l.id} />
                      <Select name="status" defaultValue={l.status ?? "new"} className="w-auto">
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_STATUS_META[s].label}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" size="sm" variant="secondary">
                        Update status
                      </Button>
                    </form>
                    {l.assigned_realtor_profile_id ? (
                      <form action={pullLeadToAdmin}>
                        <input type="hidden" name="lead_id" value={l.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Pull to admin pool
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "amber";
}) {
  return (
    <Card>
      <CardBody>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            accent === "amber" ? "text-amber-600" : "text-ink",
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </CardBody>
    </Card>
  );
}
