import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Inbox } from "lucide-react";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { FlashNotice } from "@/components/ui/flash-notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { cn } from "@/lib/cn";
import {
  LEAD_STATUSES,
  LEAD_STATUS_META,
  leadStatusMeta,
  type LeadStatus,
} from "@/lib/leads";
import { updateLeadStatus } from "./actions";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  project_id: string;
  referred_by_profile_id: string | null;
  lead_name: string;
  lead_email: string;
  lead_phone: string | null;
  message: string | null;
  is_realtor: boolean | null;
  status: string | null;
  created_at: string;
}

/** Public-safe project shape for the lead's page link. */
interface LeadProject {
  project_id: string;
  project_name: string;
  slug: string;
  city: string | null;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    flash?: string;
    flash_tone?: string;
  }>;
}) {
  const sp = await searchParams;
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <VerificationRequired />
      </div>
    );
  }

  const statusFilter = LEAD_STATUSES.includes(sp.status as LeadStatus)
    ? (sp.status as LeadStatus)
    : "";
  const q = (sp.q ?? "").trim().toLowerCase();

  const supabase = await createClient();

  // RLS returns only leads assigned to this realtor (organic steward leads +
  // referral-link leads); the eq() keeps an admin's view scoped to their own.
  const { data: leadData } = await supabase
    .from("project_leads")
    .select(
      "id, project_id, referred_by_profile_id, lead_name, lead_email, lead_phone, message, is_realtor, status, created_at",
    )
    .eq("assigned_realtor_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(500);
  const allLeads = (leadData as Lead[] | null) ?? [];

  // Resolve project names via the public-safe view (realtors can't read the
  // base table). Unpublished projects simply lose their link, not the lead.
  const projectIds = [...new Set(allLeads.map((l) => l.project_id))];
  const projById = new Map<string, LeadProject>();
  if (projectIds.length) {
    const { data: projData } = await supabase
      .from("public_projects_view")
      .select("project_id, project_name, slug, city")
      .in("project_id", projectIds);
    for (const p of (projData as LeadProject[] | null) ?? []) {
      projById.set(p.project_id, p);
    }
  }

  // Pipeline counts (over everything, before filters).
  const norm = (s: string | null): string => s ?? "new";
  const countByStatus = new Map<string, number>();
  for (const l of allLeads) {
    countByStatus.set(norm(l.status), (countByStatus.get(norm(l.status)) ?? 0) + 1);
  }
  const total = allLeads.length;
  const newCount = countByStatus.get("new") ?? 0;
  const inProgress =
    (countByStatus.get("contacted") ?? 0) + (countByStatus.get("qualified") ?? 0);
  const wonCount = countByStatus.get("won") ?? 0;

  // Apply filters.
  const leads = allLeads.filter((l) => {
    if (statusFilter && norm(l.status) !== statusFilter) return false;
    if (q) {
      const hay = `${l.lead_name} ${l.lead_email} ${l.lead_phone ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const chipHref = (s: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (sp.q) p.set("q", sp.q);
    const qs = p.toString();
    return qs ? `/dashboard/leads?${qs}` : "/dashboard/leads";
  };

  return (
    <div className="space-y-8">
      <FlashNotice searchParams={sp} />
      <Header />

      {total === 0 ? (
        <ComingSoonState />
      ) : (
        <>
          {/* Pipeline at a glance */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total leads" value={total} />
            <Stat label="New — reach out" value={newCount} accent={newCount > 0} />
            <Stat label="In progress" value={inProgress} />
            <Stat label="Deals closed" value={wonCount} />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1.5">
              <FilterChip
                href={chipHref("")}
                active={!statusFilter}
                label="All"
                count={total}
              />
              {LEAD_STATUSES.map((s) => (
                <FilterChip
                  key={s}
                  href={chipHref(s)}
                  active={statusFilter === s}
                  label={LEAD_STATUS_META[s].label}
                  count={countByStatus.get(s) ?? 0}
                />
              ))}
            </div>
            <form method="get" className="flex flex-1 gap-2 sm:max-w-xs">
              {statusFilter ? (
                <input type="hidden" name="status" value={statusFilter} />
              ) : null}
              <Input
                name="q"
                placeholder="Search name, email, phone…"
                defaultValue={sp.q ?? ""}
                className="flex-1"
              />
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>
          </div>

          {leads.length === 0 ? (
            <Card>
              <CardBody className="py-10 text-center text-sm text-slate-500">
                No leads match your filters.
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {leads.map((l) => (
                <LeadCard
                  key={l.id}
                  lead={l}
                  project={projById.get(l.project_id)}
                  viaReferralLink={l.referred_by_profile_id === profile.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      <p className="text-xs leading-relaxed text-slate-400">
        LIQWD doesn&apos;t guarantee lead quantity, quality, or conversion.
        Newer, active, and better-maintained projects may generate more interest.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Leads</h1>
      <p className="mt-1 text-slate-500">
        Every buyer inquiry routed to you, in one inbox — from your project
        pages and referral links. Work each one from first touch to deal
        closed; no referral fee, you keep 100%.
      </p>
    </div>
  );
}

/**
 * The free-leads promise, honestly framed: capture is live everywhere and the
 * inbox is wired up — what's "coming soon" is volume, as consumer traffic
 * ramps. Deliberately no counts, dates, or benchmarks.
 */
function ComingSoonState() {
  return (
    <Card className="border-dashed bg-slate-50/60">
      <CardBody className="px-6 py-10 text-center sm:px-10">
        <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-white ring-1 ring-inset ring-slate-200">
          <Inbox className="size-5 text-slate-400" strokeWidth={1.75} aria-hidden />
        </span>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-slate-500">
            Your first leads: coming soon
          </span>
        </p>
        <h2 className="mt-3 text-lg font-semibold text-ink">
          This inbox is live — leads land here the moment they arrive
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
          Every buyer inquiry on a page you&apos;re the agent for — and every
          inquiry from a referral link you share — routes straight to you,
          free, with no referral fee. LIQWD&apos;s consumer marketplace is
          young and buyer traffic is building week over week, so early volume
          can be light. The agents bound to the most active pages will be first
          in line as it grows.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/dashboard/get-free-leads" size="sm">
            Get set up for free leads
          </ButtonLink>
          <ButtonLink href="/dashboard/lead-pages" size="sm" variant="secondary">
            Share a referral link
          </ButtonLink>
        </div>
      </CardBody>
    </Card>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {label}
      <span className={cn("ml-1.5", active ? "text-white/80" : "text-slate-400")}>
        {count}
      </span>
    </Link>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardBody>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            accent ? "text-amber-600" : "text-ink",
          )}
        >
          {value}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </CardBody>
    </Card>
  );
}

function LeadCard({
  lead,
  project,
  viaReferralLink,
}: {
  lead: Lead;
  project: LeadProject | undefined;
  viaReferralLink: boolean;
}) {
  const sm = leadStatusMeta(lead.status);
  const selectDefault = LEAD_STATUSES.includes(lead.status as LeadStatus)
    ? (lead.status as LeadStatus)
    : "new";

  return (
    <Card>
      <CardBody className="space-y-3">
        {/* Top line: name + status */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-800">
              {lead.lead_name}
              {lead.is_realtor ? (
                <Badge tone="brand" className="ml-2 align-middle">
                  Agent inquiry
                </Badge>
              ) : null}
            </p>
            <p className="text-xs text-slate-400">
              {new Date(lead.created_at).toLocaleString("en-CA")}
              {project ? (
                <>
                  {" · "}
                  <a
                    href={`/projects/${project.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {project.project_name}
                    <ExternalLink
                      className="ml-0.5 inline size-3 align-[-1px]"
                      aria-hidden
                    />
                  </a>
                </>
              ) : null}
              {" · "}
              {viaReferralLink ? "via your referral link" : "from your project page"}
            </p>
          </div>
          <Badge tone={sm.tone}>{sm.label}</Badge>
        </div>

        {/* Contact the lead */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-sm">
          <a
            href={`mailto:${lead.lead_email}`}
            className="font-medium text-brand-700 hover:underline"
          >
            {lead.lead_email}
          </a>
          {lead.lead_phone ? (
            <a
              href={`tel:${lead.lead_phone}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {lead.lead_phone}
            </a>
          ) : (
            <span className="text-slate-400">No phone</span>
          )}
        </div>

        {lead.message ? (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {lead.message}
          </p>
        ) : null}

        {/* Work the pipeline */}
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
          <form action={updateLeadStatus} className="flex items-end gap-2">
            <input type="hidden" name="lead_id" value={lead.id} />
            <Select name="status" defaultValue={selectDefault} className="w-auto">
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
        </div>
      </CardBody>
    </Card>
  );
}
