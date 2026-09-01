import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Handshake,
  FileText,
  ClipboardCheck,
  UserCircle,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  CreditCard,
  ClipboardList,
  Megaphone,
  Mail,
  BarChart3,
  Inbox,
  Globe,
  Link2,
  Clock,
  Magnet,
  type LucideIcon,
} from "lucide-react";
import {
  requireUserProfile,
  isApproved,
  isPro,
  isUltra,
  isDeveloper,
  developerCanConnect,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPriceBand, primaryBuilderName } from "@/lib/types";
import { CardImage } from "@/components/public/card-image";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { SECTION_ACCENT, type SectionAccent } from "@/lib/section-accents";
import { Notice } from "@/components/ui/notice";
import {
  ActivationTracker,
  type ActivationStep,
} from "@/components/dashboard/activation-tracker";
import { ConfettiBurst } from "@/components/dashboard/confetti-burst";
import { NeedsYou, type ActionItem } from "@/components/dashboard/home/needs-you";
import { Scoreboard } from "@/components/dashboard/home/scoreboard";
import {
  markVerificationCelebrated,
  markFirstLeadCelebrated,
} from "./celebration-actions";

export const metadata: Metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const VISIBLE = ["approved", "published"];

interface RailProject {
  id: string;
  slug: string;
  project_name: string;
  builder_name: string | null;
  city: string | null;
  sales_status: string | null;
  price_from_public: number | null;
  price_to_public: number | null;
  hero_image_url: string | null;
}

export default async function DashboardHome() {
  const { profile, userId } = await requireUserProfile();
  const approved = isApproved(profile);
  const pro = isPro(profile);
  const ultra = isUltra(profile);
  const firstName = profile.first_name ?? "there";

  // Developers get a dedicated, role-appropriate home.
  if (isDeveloper(profile)) {
    return <DeveloperHome profile={profile} userId={userId} firstName={firstName} />;
  }

  const supabase = await createClient();

  // Agent-panel UX reorg, Phase 2: Home is "today's plan", not a directory.
  // Three zones — Needs you (next-best-action stack) · Setup progress (until
  // 100%) · Your numbers (three tiles about the agent's business) — plus a
  // small new-homes rail. Everything is computed from CURRENT state.
  // eslint-disable-next-line react-hooks/purity -- async Server Component, runs per request.
  const now = Date.now();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const quarterAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Unverified: has the agent already submitted their RECO check?
  let hasSubmittedVerification = false;
  if (!approved) {
    const { count } = await supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("status", "pending");
    hasSubmittedVerification = (count ?? 0) > 0;
  }

  // Setup signals — derived purely from CURRENT data, never an assumed order.
  const [anyVerReq, subCount, pickCount] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
    supabase
      .from("property_submissions")
      .select("id", { count: "exact", head: true })
      .eq("submitted_by_user_id", profile.id),
    supabase
      .from("realtor_page_projects")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id),
  ]);
  const status = profile.verification_status;
  const submitted =
    approved || Boolean(profile.reco_registration_number) || (anyVerReq.count ?? 0) > 0;
  const profileDone = Boolean(
    profile.first_name && profile.brokerage_name && profile.avatar_url,
  );
  const firstActionDone = (subCount.count ?? 0) > 0 || (pickCount.count ?? 0) > 0;

  const rawSteps: ActivationStep[] = [
    { key: "account", label: "Account created", state: "done" },
    {
      key: "submitted",
      label: "Verification submitted",
      state: submitted ? "done" : "todo",
      href: "/dashboard/verify",
    },
    {
      key: "verified",
      label: "Verified",
      state:
        status === "approved"
          ? "done"
          : status === "rejected" || status === "suspended"
            ? "blocked"
            : "todo",
      sub:
        status === "approved"
          ? undefined
          : status === "rejected"
            ? "Not approved — review and resubmit."
            : status === "suspended"
              ? "Account suspended — contact support."
              : submitted
                ? "Our team is reviewing your RECO registration."
                : undefined,
      href: status === "approved" ? undefined : "/dashboard/verify",
    },
    {
      key: "profile",
      label: "Profile completed",
      sub: profileDone ? undefined : "Name, brokerage, and a photo.",
      state: profileDone ? "done" : "todo",
      href: "/dashboard/profile",
    },
    {
      key: "first-action",
      label: "First project action",
      sub: firstActionDone ? undefined : "Add a project to your page, or submit one.",
      state: firstActionDone ? "done" : "todo",
      href: approved ? "/dashboard/my-page" : "/dashboard/projects",
    },
  ];
  const firstOpen = rawSteps.find((s) => s.state === "todo" || s.state === "blocked");
  const trackerSteps = rawSteps.map((s) =>
    s === firstOpen && s.state === "todo" ? { ...s, state: "active" as const } : s,
  );
  const allDone = rawSteps.every((s) => s.state === "done");

  const celebrateApproval =
    approved &&
    (profile as { verification_celebrated_at?: string | null })
      .verification_celebrated_at == null;
  const firstLeadPending =
    approved &&
    (profile as { first_lead_celebrated_at?: string | null })
      .first_lead_celebrated_at == null;

  // The agent's numbers (approved only — RLS gates the views).
  let matchedPages = 0;
  let buyerInquiries = 0;
  let newLeads = 0;
  let leads30 = 0;
  let medianResponseHours: number | null = null;
  let recent: RailProject[] = [];
  if (approved) {
    const [matched, leads, fresh, month, responded, rec] = await Promise.all([
      supabase
        .from("public_projects_view")
        .select("public_page_id", { count: "exact", head: true })
        .eq("assigned_realtor_profile_id", profile.id),
      supabase
        .from("project_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_realtor_profile_id", profile.id),
      supabase
        .from("project_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_realtor_profile_id", profile.id)
        .eq("status", "new"),
      supabase
        .from("project_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_realtor_profile_id", profile.id)
        .gte("created_at", monthAgo),
      supabase
        .from("project_leads")
        .select("created_at, first_responded_at")
        .eq("assigned_realtor_profile_id", profile.id)
        .not("first_responded_at", "is", null)
        .gte("created_at", quarterAgo)
        .limit(300),
      supabase
        .from("broker_projects_view")
        .select(
          "id, slug, project_name, builder_name, city, sales_status, price_from_public, price_to_public, hero_image_url",
        )
        .in("record_status", VISIBLE)
        .gte("created_at", weekAgo)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    matchedPages = matched.count ?? 0;
    buyerInquiries = leads.count ?? 0;
    newLeads = fresh.count ?? 0;
    leads30 = month.count ?? 0;
    const hours = ((responded.data as { created_at: string; first_responded_at: string }[] | null) ?? [])
      .map((r) => (new Date(r.first_responded_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000)
      .filter((h) => Number.isFinite(h) && h >= 0)
      .sort((a, b) => a - b);
    if (hours.length) medianResponseHours = hours[Math.floor(hours.length / 2)];
    recent = (rec.data as RailProject[] | null) ?? [];
  }

  // ---- Needs you: ranked, one button each -----------------------------------
  const publicPageOn =
    (profile as { is_public_profile_enabled?: boolean | null }).is_public_profile_enabled === true;
  const needs: ActionItem[] = [];
  if (!approved) {
    const suspended = status === "suspended";
    const rejected = status === "rejected";
    const underReview = status === "pending" && hasSubmittedVerification;
    needs.push({
      key: "verify",
      icon: underReview ? Clock : ShieldCheck,
      tone: suspended ? "red" : "brand",
      title: suspended
        ? "Your account is suspended"
        : rejected
          ? "Your verification needs another look"
          : underReview
            ? "Verification submitted — under review"
            : "Verify your RECO registration",
      body: suspended
        ? "Broker tools are paused. If you think this is a mistake, reply to any LIQWD email and we'll take a look."
        : rejected
          ? "Resubmit with your RECO registration number and current brokerage — approvals usually happen the same day."
          : underReview
            ? "We'll email you the moment you're approved, usually the same day. Meanwhile, finish your profile so your page is ready."
            : "About 2 minutes. Unlocks broker pricing, buyer leads routed to you, and every tool in the rail.",
      href: underReview ? "/dashboard/profile" : "/dashboard/verify",
      cta: suspended ? "Contact support" : rejected ? "Resubmit" : underReview ? "Finish profile" : "Verify now",
    });
  }
  if (approved && newLeads > 0) {
    needs.push({
      key: "leads",
      icon: Inbox,
      tone: "emerald",
      title: newLeads === 1 ? "1 new lead is waiting" : `${newLeads} new leads are waiting`,
      body: "Fast replies convert best — buyers who hear back within the hour book the most appointments.",
      href: "/dashboard/leads?status=new",
      cta: "Reply now",
    });
  }
  if (approved && !profileDone) {
    needs.push({
      key: "profile",
      icon: UserCircle,
      tone: "amber",
      title: "Finish your profile",
      body: "Your name, brokerage, and a photo sit on top of every page and link you share. Two minutes.",
      href: "/dashboard/profile",
      cta: "Complete profile",
    });
  }
  if (approved && profileDone && !publicPageOn) {
    needs.push({
      key: "public",
      icon: Globe,
      tone: "amber",
      title: "Your public page is off",
      body: "Turn it on to appear as a verified agent on LIQWD and start receiving buyer inquiries.",
      href: "/dashboard/my-page",
      cta: "Turn it on",
    });
  }
  if (approved && !firstActionDone) {
    needs.push({
      key: "first",
      icon: Magnet,
      tone: "brand",
      title: "Set up your first lead page",
      body: "Become the agent on a project page and its buyer inquiries route to you — free, no referral fee.",
      href: "/dashboard/get-free-leads",
      cta: "Get free leads",
    });
  }
  const caughtUp =
    matchedPages === 0
      ? {
          title: "Grow your lead pages.",
          body: "The more project pages you're the agent on, the more inquiries route to you.",
          href: "/dashboard/lead-pages",
          cta: "Add a lead page",
        }
      : !pro
        ? {
            title: "Try a client hub.",
            body: "A personal page for one buyer with the homes you've picked — one link, every inquiry yours.",
            href: "/dashboard/shortlists",
            cta: "Build a client hub",
          }
        : {
            title: "Sharpen your pitch.",
            body: "The pre-construction guide covers qualifying, objections, and closing.",
            href: "/dashboard/learn",
            cta: "Open the guide",
          };

  const responseLabel =
    medianResponseHours == null
      ? "—"
      : medianResponseHours < 1
        ? `${Math.max(1, Math.round(medianResponseHours * 60))} min`
        : `${medianResponseHours.toFixed(medianResponseHours < 10 ? 1 : 0)} h`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            {approved
              ? "Here's what needs you today."
              : "One step from unlocking everything."}
          </p>
        </div>
        <ButtonLink href={approved ? "/dashboard/leads" : "/dashboard/verify"}>
          {approved ? "Open leads" : "Start verification"}
        </ButtonLink>
      </div>

      {profile.role === "realtor" && celebrateApproval ? (
        <>
          <ConfettiBurst variant="big" onFired={markVerificationCelebrated} />
          <Notice tone="success">
            <span className="font-semibold">You&apos;re verified</span> — all
            broker tools are unlocked. Welcome to the network.{" "}
            <Link href="/dashboard/my-page" className="font-semibold underline">
              Grab your verified badge →
            </Link>
          </Notice>
        </>
      ) : null}

      {profile.role === "realtor" &&
      !celebrateApproval &&
      firstLeadPending &&
      buyerInquiries > 0 ? (
        <>
          <ConfettiBurst variant="big" onFired={markFirstLeadCelebrated} />
          <Notice tone="success">
            <span className="font-semibold">Your first lead is in</span> — a
            buyer asked to be connected with you. Follow up fast; early
            follow-ups convert best.{" "}
            <Link href="/dashboard/leads" className="font-semibold underline">
              Open your leads →
            </Link>
          </Notice>
        </>
      ) : null}

      <NeedsYou items={needs} caughtUp={caughtUp} />

      {profile.role === "realtor" && !allDone ? (
        <ActivationTracker steps={trackerSteps} />
      ) : null}

      {approved ? (
        <Scoreboard
          tiles={[
            {
              icon: Inbox,
              label: "Leads, last 30 days",
              value: String(leads30),
              hint: buyerInquiries > 0 ? `${buyerInquiries} all time` : "none yet — add a lead page",
              href: "/dashboard/leads",
            },
            {
              icon: Clock,
              label: "Your reply time",
              value: responseLabel,
              hint:
                medianResponseHours == null
                  ? "median of your first replies"
                  : medianResponseHours <= 1
                    ? "under an hour — that's the winning zone"
                    : "aim for under an hour",
              href: "/dashboard/leads",
            },
            {
              icon: Link2,
              label: "Pages sending you leads",
              value: String(matchedPages),
              hint: matchedPages > 0 ? "you're the agent" : "become the agent on a project",
              href: "/dashboard/lead-pages",
            },
          ]}
        />
      ) : null}

      {approved && recent.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              <Building2 className="size-3.5" aria-hidden /> New homes this week
            </h2>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
            >
              Browse all <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => {
              const band = formatPriceBand(p.price_from_public, p.price_to_public);
              return (
                <Link key={p.id} href={`/dashboard/projects/${p.slug}`}>
                  <Card className="h-full transition-shadow hover:shadow-md">
                    <div className="aspect-video overflow-hidden rounded-t-xl bg-slate-100">
                      <CardImage
                        src={p.hero_image_url}
                        alt={p.project_name}
                        name={p.project_name}
                      />
                    </div>
                    <CardBody>
                      {p.sales_status ? (
                        <Badge tone="brand">{p.sales_status.replace(/_/g, " ")}</Badge>
                      ) : null}
                      <h3 className="mt-2 line-clamp-2 font-semibold text-ink">
                        {p.project_name}
                      </h3>
                      <p className="line-clamp-1 text-sm text-slate-500">
                        {[primaryBuilderName(p.builder_name), p.city]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {band ? (
                        <p className="mt-2 text-sm font-medium text-slate-700">{band}</p>
                      ) : null}
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {approved && !pro && !ultra ? <ProSpotlight /> : null}
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
  value: number | string;
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
  ultra,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  href: string;
  cta: string;
  enabled: boolean;
  lockedHint?: string;
  ultra?: boolean;
}) {
  return (
    <Card className={enabled ? "transition-shadow hover:shadow-md" : undefined}>
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100">
            <Icon
              className={enabled ? "size-5 text-slate-700" : "size-5 text-slate-400"}
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
          {ultra ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600">
              <Sparkles className="size-3" aria-hidden /> Ultra
            </span>
          ) : null}
        </div>
        <h3 className="mt-3 font-semibold text-ink">{title}</h3>
        <p className="mt-1 flex-1 text-sm text-slate-500">{body}</p>
        <div className="mt-4">
          {enabled ? (
            <ButtonLink href={href} size="sm" variant="secondary">
              {cta}
            </ButtonLink>
          ) : (
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-400">
                {lockedHint}
              </span>
              <Link
                href="/dashboard/verify"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                Get verified <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/** A labelled group of action cards on the home — mirrors the sidebar's
 *  Earn / Explore / Account intent buckets. `accent` is the money-green "Earn"
 *  zone. */
function HomeSection({
  label,
  accent,
  zone = false,
  description,
  children,
}: {
  label: string;
  accent?: SectionAccent;
  zone?: boolean;
  description?: string;
  children: ReactNode;
}) {
  const a = accent ? SECTION_ACCENT[accent] : null;
  return (
    <div
      className={
        zone && a
          ? cn("rounded-2xl p-4 ring-1 ring-inset sm:p-5", a.zone)
          : undefined
      }
    >
      <div className="mb-3">
        <h2
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em]",
            a ? a.header : "text-slate-400",
          )}
        >
          <span
            className={cn("size-1.5 rounded-full", a ? a.dotBg : "bg-slate-300")}
            aria-hidden
          />
          {label}
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function ProSpotlight() {
  const perks = [
    "A branded public profile that wins you free leads",
    "Up to 10 free project landing pages",
    "Buyer Mandate — let matching inventory find your buyer",
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            <Zap className="size-3" strokeWidth={2} aria-hidden /> Pro
          </span>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
            Do more with LIQWD Pro
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Your free plan stays free. Pro adds the tooling that helps you move
            faster and look sharper with clients.
          </p>
          <ul className="mt-4 space-y-1.5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm text-slate-700">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-brand-500" />
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <ButtonLink href="/dashboard/upgrade" className="shrink-0">
          Upgrade to Pro
        </ButtonLink>
      </div>
    </div>
  );
}

/** Muted, non-interactive card for features that aren't live yet. */
function ComingSoonCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <Card className="border-dashed bg-slate-50/60">
      <CardBody className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200">
            <Icon className="size-5 text-slate-400" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Coming soon
          </span>
        </div>
        <h3 className="mt-3 font-semibold text-slate-600">{title}</h3>
        <p className="mt-1 flex-1 text-sm text-slate-400">{body}</p>
      </CardBody>
    </Card>
  );
}

async function DeveloperHome({
  profile,
  userId,
  firstName,
}: {
  profile: Profile;
  userId: string;
  firstName: string;
}) {
  const supabase = await createClient();
  const [{ count: openMandates }, { count: myRfps }] = await Promise.all([
    supabase
      .from("buyer_mandates_developer_view")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("deal_rfps")
      .select("id", { count: "exact", head: true })
      .eq("created_by_user_id", userId),
  ]);
  const canConnect = developerCanConnect(profile);

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-700 text-white">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-lg">
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-200">
              Developer workspace
            </span>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
              Push your priority inventory to agents, tap verified buyer demand,
              and promote your projects — all from one place.
            </p>
          </div>
          <ButtonLink
            href="/dashboard/deal-requests/new"
            variant="white"
            className="shrink-0"
          >
            Post an offer
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat icon={ClipboardList} label="Ready buyers" value={openMandates ?? 0} />
        <Stat icon={Handshake} label="Your offers" value={myRfps ?? 0} />
        <Stat
          icon={CreditCard}
          label="Connections"
          value={
            profile.developer_mandate_access
              ? "Unlimited"
              : profile.mandate_connect_credits
          }
        />
      </div>

      <HomeSection
        label="Sell / Lease now"
        accent="emerald"
        description="Move inventory — agents & renters"
      >
        <ActionCard
          icon={Handshake}
          title="Post an offer"
          body="Put your priority units and limited-time incentives in front of Ultra agents — bulk, inventory, listings, or a full development."
          href="/dashboard/deal-requests/new"
          cta="Post an offer"
          enabled
        />
        <ActionCard
          icon={FileText}
          title="Your offers"
          body="Track what you're moving and review the proposals agents send back."
          href="/dashboard/deal-requests"
          cta="View offers"
          enabled
        />
        <ActionCard
          icon={ClipboardCheck}
          title="Ready buyers"
          body="Verified buyer demand from agents — match your inventory to buyers who are ready now."
          href="/dashboard/buyer-mandates"
          cta="See buyer demand"
          enabled
        />
        <ActionCard
          icon={CreditCard}
          title="Connections & billing"
          body={
            canConnect
              ? "Manage how you reach agents, plus your billing."
              : "Unlock the ability to reach agents holding ready buyers."
          }
          href="/dashboard/developer"
          cta={canConnect ? "Manage connections" : "Unlock connections"}
          enabled
        />
      </HomeSection>

      {/* Promote — the operator ad-revenue zone (elevated). */}
      <HomeSection
        label="Promote now"
        accent="amber"
        zone
        description="Get in front of buyers & agents"
      >
        <ComingSoonCard
          icon={Megaphone}
          title="Featured listing"
          body="Put your project at the top of browse and the homepage, with a Featured badge agents and buyers notice."
        />
        <ComingSoonCard
          icon={Mail}
          title="eBlast to agents"
          body="Broadcast your project to the verified realtor database — targeted by city and focus."
        />
        <ComingSoonCard
          icon={Mail}
          title="eBlast to buyers"
          body="Reach motivated end-buyers directly with a dedicated send for your project."
        />
      </HomeSection>

      {/* Research — insights, coming soon. */}
      <HomeSection
        label="Research"
        accent="sky"
        description="Demand & performance insights"
      >
        <ComingSoonCard
          icon={BarChart3}
          title="Project analytics"
          body="Views, saves, leads, and which agents engaged — the full funnel for every project."
        />
        <ComingSoonCard
          icon={TrendingUp}
          title="Buyer demand signals"
          body="See where verified buyer demand is concentrated by city, price, and unit type."
        />
      </HomeSection>
    </div>
  );
}
