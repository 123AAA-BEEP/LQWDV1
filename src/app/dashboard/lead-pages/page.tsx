import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { Building2, ExternalLink, Search } from "lucide-react";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { VerificationRequired } from "@/components/dashboard/locked";
import { formatPriceBand } from "@/lib/types";
import { CopyLinkButton } from "./copy-link-button";

export const metadata: Metadata = { title: "Lead Pages" };
export const dynamic = "force-dynamic";

/** The public-safe project shape from `public_projects_view`. */
interface PageRow {
  project_id: string;
  public_page_id: string;
  slug: string;
  project_name: string;
  city: string | null;
  neighbourhood: string | null;
  builder_name: string | null;
  hero_image_url: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
}

const VIEW_COLUMNS =
  "project_id, public_page_id, slug, project_name, city, neighbourhood, builder_name, hero_image_url, price_from_public, price_to_public";

type Tone = "success" | "warning" | "neutral";

/** ISO timestamp `days` ago — kept out of render bodies for the purity rule. */
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/**
 * Free-lead-campaign status from the stewardship expiry. NB: even after the
 * campaign window ends, the realtor's *referral link still attributes leads to
 * them* (the public lead action honours `?ref` regardless of stewardship), so
 * an ended campaign only means organic page leads stop routing to them.
 */
function campaignStatus(until: string | null): { label: string; tone: Tone } {
  if (!until) return { label: "Active", tone: "success" };
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return { label: "Campaign ended", tone: "neutral" };
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 14) return { label: `Expires in ${days}d`, tone: "warning" };
  return { label: "Active", tone: "success" };
}

export default async function LeadPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <Header />
        <VerificationRequired />
      </div>
    );
  }

  const code = profile.referral_code;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "liqwd.com";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;
  const refLink = (slug: string) =>
    code ? `${base}/projects/${slug}?ref=${code}` : `${base}/projects/${slug}`;

  const supabase = await createClient();

  // Pages this realtor is bound to (the free lead campaign). The view is
  // public-safe and only returns published projects with an active page — i.e.
  // exactly the ones whose referral link actually resolves.
  const { data: boundData } = await supabase
    .from("public_projects_view")
    .select(VIEW_COLUMNS)
    .eq("assigned_realtor_profile_id", profile.id);
  const bound = (boundData as PageRow[] | null) ?? [];

  // Stewardship expiry for those pages (approved realtors may read pages).
  const pageIds = bound.map((b) => b.public_page_id).filter(Boolean);
  const expiryByPage = new Map<string, string | null>();
  if (pageIds.length) {
    const { data: meta } = await supabase
      .from("public_project_pages")
      .select("id, assigned_realtor_until")
      .in("id", pageIds);
    for (const m of (meta as { id: string; assigned_realtor_until: string | null }[] | null) ?? []) {
      expiryByPage.set(m.id, m.assigned_realtor_until);
    }
  }

  // This realtor's leads, for a per-project count + a headline total. RLS only
  // returns leads assigned to them (organic steward leads + referral-link leads,
  // which are always assigned to the referrer).
  const { data: leadRows } = await supabase
    .from("project_leads")
    .select("project_id, referred_by_profile_id")
    .eq("assigned_realtor_profile_id", profile.id);
  const leadsByProject = new Map<string, number>();
  let referredTotal = 0;
  for (const l of (leadRows as { project_id: string; referred_by_profile_id: string | null }[] | null) ?? []) {
    leadsByProject.set(l.project_id, (leadsByProject.get(l.project_id) ?? 0) + 1);
    if (l.referred_by_profile_id === profile.id) referredTotal += 1;
  }
  const leadTotal = leadRows?.length ?? 0;

  // Link views (30d) — proof the sharing works, from the visit log (RLS
  // returns only this agent's rows).
  const { count: viewCount } = await supabase
    .from("link_visits")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profile.id)
    .gte("created_at", daysAgoIso(30));

  // "Promote any project" search — every verified agent. The server-side lead
  // action attributes any approved agent's code, so gating this UI only taxed
  // the viral loop without protecting anything.
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  let promote: PageRow[] = [];
  if (query) {
    const { data } = await supabase
      .from("public_projects_view")
      .select(VIEW_COLUMNS)
      .or(
        `project_name.ilike.%${query}%,city.ilike.%${query}%,builder_name.ilike.%${query}%`,
      )
      .order("project_name", { ascending: true })
      .limit(24);
    promote = (data as PageRow[] | null) ?? [];
  }

  return (
    <div className="space-y-8">
      <Header />

      {!code ? (
        <Card>
          <CardBody className="text-sm text-slate-500">
            Your personal referral code is being generated — refresh in a moment
            and your links will attribute leads to you.
          </CardBody>
        </Card>
      ) : null}

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Your project pages" value={String(bound.length)} />
        <Stat label="Link views (30 days)" value={String(viewCount ?? 0)} />
        <Stat label="Leads attributed to you" value={String(leadTotal)} />
        <Stat label="From your referral links" value={String(referredTotal)} />
      </div>

      {/* ---- Free lead campaign: pages you're bound to -------------------- */}
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
            Your project pages
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Projects you&apos;re bound to through the free lead campaign — submit
            or update a project and you become its agent. Share a page&apos;s
            referral link and any lead it captures is attributed to you.
          </p>
        </div>

        {bound.length === 0 ? (
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-slate-600">
                You&apos;re not bound to any project pages yet.
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Submit a new project or send an update on an existing one — once
                it&apos;s approved you become the agent on its page and its buyer
                leads route to you.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <ButtonLink href="/dashboard/submit" size="sm">
                  Submit a project
                </ButtonLink>
                <ButtonLink href="/dashboard/projects" size="sm" variant="secondary">
                  Browse projects
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {bound.map((p) => (
              <PageRowCard
                key={p.public_page_id}
                project={p}
                pageUrl={`${base}/projects/${p.slug}`}
                refUrl={refLink(p.slug)}
                hasCode={!!code}
                status={campaignStatus(expiryByPage.get(p.public_page_id) ?? null)}
                leadCount={leadsByProject.get(p.project_id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- Promote any project (every verified agent) ------------------- */}
      <section className="space-y-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-sky-700">
            <span className="size-1.5 rounded-full bg-sky-500" aria-hidden />
            Promote any project
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Every published project has a referral link with your code on it —
            not just the ones you&apos;re bound to. Hand it to a buyer
            you&apos;re working and their enquiry lands with you.
          </p>
        </div>

        <form method="get" className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Search published projects by name, city, or builder…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {query ? (
            <Link href="/dashboard/lead-pages">
              <Button type="button" variant="secondary">
                Clear
              </Button>
            </Link>
          ) : null}
        </form>

        {query ? (
          promote.length === 0 ? (
            <Card>
              <CardBody className="text-center text-sm text-slate-500">
                No published projects match “{query}”.
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-3">
              {promote.map((p) => (
                <PageRowCard
                  key={p.public_page_id}
                  project={p}
                  pageUrl={`${base}/projects/${p.slug}`}
                  refUrl={refLink(p.slug)}
                  hasCode={!!code}
                />
              ))}
            </div>
          )
        ) : (
          <Card>
            <CardBody className="text-sm text-slate-500">
              Search above to find a project and copy its referral link.
            </CardBody>
          </Card>
        )}
      </section>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Lead Pages
      </h1>
      <p className="mt-1 text-slate-500">
        Your project landing pages and the direct referral links you can hand to
        a buyer. Every lead from your link is attributed to you.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-2xl font-semibold tabular-nums text-ink">{value}</p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </CardBody>
    </Card>
  );
}

function PageRowCard({
  project,
  pageUrl,
  refUrl,
  hasCode,
  status,
  leadCount,
}: {
  project: PageRow;
  pageUrl: string;
  refUrl: string;
  hasCode: boolean;
  status?: { label: string; tone: Tone };
  leadCount?: number;
}) {
  const band = formatPriceBand(
    project.price_from_public,
    project.price_to_public,
  );
  const location = [project.neighbourhood, project.city]
    .filter(Boolean)
    .join(", ");

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
            {project.hero_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={project.hero_image_url}
                alt={project.project_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="size-5 text-slate-300" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-ink">
                {project.project_name}
              </h3>
              {status ? <Badge tone={status.tone}>{status.label}</Badge> : null}
            </div>
            <p className="truncate text-sm text-slate-500">
              {[project.builder_name, location].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {band ? <span>{band}</span> : null}
              {typeof leadCount === "number" ? (
                <span>
                  {band ? " · " : ""}
                  {leadCount} {leadCount === 1 ? "lead" : "leads"} to you
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            <ExternalLink className="size-4" aria-hidden /> View page
          </a>
          {hasCode ? <CopyLinkButton url={refUrl} /> : null}
        </div>
      </CardBody>
    </Card>
  );
}
