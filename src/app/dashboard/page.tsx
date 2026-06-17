import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  PlusCircle,
  UserCircle,
  ShieldCheck,
  TrendingUp,
  MapPin,
  FileText,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { requireUserProfile, isApproved, isUltra } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UltraBadge } from "@/components/dashboard/ultra";
import { formatPriceBand } from "@/lib/types";
import type { ProjectListItem } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardHome() {
  const { profile, userId } = await requireUserProfile();
  const approved = isApproved(profile);
  const ultra = isUltra(profile);
  const firstName = profile.first_name ?? "there";

  const supabase = await createClient();

  // Live counts powering the stat strip. Cheap HEAD count queries.
  // eslint-disable-next-line react-hooks/purity -- async Server Component: runs once per request, not a render.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: projectCount },
    { count: newThisWeek },
    { data: cityRows },
    { count: submissionCount },
    { data: recent },
  ] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    supabase.from("projects").select("city").not("city", "is", null),
    supabase
      .from("property_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_user_id", userId),
    supabase
      .from("projects")
      .select(
        "id, slug, project_name, builder_name, city, sales_status, construction_status, occupancy_estimate_text, price_from_public, price_to_public, hero_image_url, record_status",
      )
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const cityCount = new Set(
    (cityRows ?? []).map((r) => r.city as string),
  ).size;
  const recentProjects = (recent as ProjectListItem[] | null) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            {approved
              ? "Browse active new-home projects and work your opportunities."
              : "Get verified to unlock broker-only project tools."}
          </p>
        </div>
        <ButtonLink href={approved ? "/dashboard/projects" : "/dashboard/verify"}>
          {approved ? "Browse projects" : "Start verification"}
        </ButtonLink>
      </div>

      {/* Stat strip — only meaningful once a realtor can see inventory. */}
      {approved ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={Building2} label="Active projects" value={projectCount ?? 0} />
          <Stat icon={TrendingUp} label="New this week" value={newThisWeek ?? 0} />
          <Stat icon={MapPin} label="Cities covered" value={cityCount} />
          <Stat
            icon={FileText}
            label="Your submissions"
            value={submissionCount ?? 0}
          />
        </div>
      ) : null}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            icon={Building2}
            title="Browse projects"
            body="Search active new-home projects across Ontario."
            href="/dashboard/projects"
            cta="View projects"
            enabled={approved}
            lockedHint="Available after verification"
          />
          <ActionCard
            icon={PlusCircle}
            title="Submit a project"
            body="Add a new project for admin review."
            href="/dashboard/submit"
            cta="Submit project"
            enabled
          />
          <ActionCard
            icon={approved ? UserCircle : ShieldCheck}
            title={approved ? "Your profile" : "Get verified"}
            body={
              approved
                ? "Update your details and brokerage info."
                : "Submit your RECO registration details to verify."
            }
            href={approved ? "/dashboard/profile" : "/dashboard/verify"}
            cta={approved ? "Edit profile" : "Start verification"}
            enabled
          />
        </div>
      </div>

      {/* Recently added rail */}
      {approved && recentProjects.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Recently added
            </h2>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              View all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((p) => {
              const band = formatPriceBand(
                p.price_from_public,
                p.price_to_public,
              );
              return (
                <Link key={p.id} href={`/dashboard/projects/${p.slug}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-t-xl bg-slate-100">
                      {p.hero_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.hero_image_url}
                          alt={p.project_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2
                          className="size-8 text-slate-300"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                      )}
                    </div>
                    <CardBody>
                      {p.sales_status ? (
                        <Badge tone="brand">
                          {p.sales_status.replace(/_/g, " ")}
                        </Badge>
                      ) : null}
                      <h3 className="mt-2 font-semibold text-ink">
                        {p.project_name}
                      </h3>
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
        </div>
      ) : null}

      {/* Ultra spotlight — locked teaser for non-Ultra members. */}
      {!ultra ? <UltraSpotlight /> : null}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <Icon className="size-5 text-brand-600" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function ActionCard({
  icon: Icon,
  title,
  body,
  href,
  cta,
  enabled,
  lockedHint,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
  enabled: boolean;
  lockedHint?: string;
}) {
  return (
    <Card className={enabled ? "transition-shadow hover:shadow-md" : undefined}>
      <CardBody className="flex h-full flex-col">
        <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100">
          <Icon
            className={enabled ? "size-5 text-slate-700" : "size-5 text-slate-400"}
            strokeWidth={1.75}
            aria-hidden
          />
        </span>
        <h3 className="mt-3 font-semibold text-ink">{title}</h3>
        <p className="mt-1 flex-1 text-sm text-slate-500">{body}</p>
        <div className="mt-4">
          {enabled ? (
            <ButtonLink href={href} size="sm" variant="secondary">
              {cta}
            </ButtonLink>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              {lockedHint}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function UltraSpotlight() {
  const perks = [
    "Market intel: price history & sales velocity",
    "Early & off-market project access",
    "Priority on new listings and updates",
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-amber-400/30 bg-ink">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-lg">
          <UltraBadge size="md" />
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
            Work the market with an edge
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Your free plan stays free. Ultra adds the deeper intel and early
            access that serious new-construction agents rely on.
          </p>
          <ul className="mt-4 space-y-1.5">
            {perks.map((perk) => (
              <li
                key={perk}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-amber-400"
                />
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/dashboard/ultra"
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-amber-400/10 px-4 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-400/20"
        >
          See what&apos;s in Ultra
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
