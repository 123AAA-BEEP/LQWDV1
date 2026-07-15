import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Handshake,
  FileText,
  ClipboardCheck,
  PlusCircle,
  UserCircle,
  ShieldCheck,
  TrendingUp,
  MapPin,
  ArrowRight,
  Sparkles,
  Zap,
  CreditCard,
  ClipboardList,
  Megaphone,
  Mail,
  BarChart3,
  Gift,
  Coins,
  Link2,
  Inbox,
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
import { GetStartedBanner } from "@/components/dashboard/onboarding/get-started-banner";
import { Notice } from "@/components/ui/notice";
import {
  ActivationTracker,
  type ActivationStep,
} from "@/components/dashboard/activation-tracker";
import { ConfettiBurst } from "@/components/dashboard/confetti-burst";
import {
  markVerificationCelebrated,
  markFirstLeadCelebrated,
} from "./celebration-actions";
import { PlaybookCallout } from "@/components/dashboard/playbook-callout";
import { LeadPathStatus } from "@/components/dashboard/lead-path-status";
import { NextStepCard } from "@/components/dashboard/next-step-card";

export const metadata: Metadata = { title: "Dashboard" };
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

  // Live stats + a recently-added rail, for approved realtors only (RLS gates
  // broker_projects_view to approved users).
  // eslint-disable-next-line react-hooks/purity -- async Server Component, runs per request.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let projectCount = 0;
  let newThisWeek = 0;
  let cityCount = 0;
  let matchedPages = 0;
  let buyerInquiries = 0;
  let recent: RailProject[] = [];

  // Unverified: has the agent already submitted their RECO check? Drives the
  // "your next step" hero (verify now vs. under review).
  let hasSubmittedVerification = false;
  if (!approved) {
    const { count } = await supabase
      .from("verification_requests")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("status", "pending");
    hasSubmittedVerification = (count ?? 0) > 0;
  }

  // Activation tracker signals + steps. Derived purely from CURRENT data —
  // never from an assumed order: auto-verification can complete several steps
  // in one moment, and profile/project steps can precede verification.
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
  // The first incomplete, unblocked step gets the "in progress" treatment —
  // waiting-on-review reads as alive, not stalled.
  const firstOpen = rawSteps.find((s) => s.state === "todo" || s.state === "blocked");
  const trackerSteps = rawSteps.map((s) =>
    s === firstOpen && s.state === "todo" ? { ...s, state: "active" as const } : s,
  );
  const allDone = rawSteps.every((s) => s.state === "done");

  // The big once-ever "you're verified" moment — fires on the TRANSITION to
  // approved regardless of path (manual review discovered on a later login,
  // or instant auto-verification). The DB flag is the cross-device guard.
  const celebrateApproval =
    approved &&
    (profile as { verification_celebrated_at?: string | null })
      .verification_celebrated_at == null;

  // Confetti #3 — the first buyer lead (the real magic moment). Never fires
  // the same visit as the approval burst; it keeps for the next load.
  const firstLeadPending =
    approved &&
    (profile as { first_lead_celebrated_at?: string | null })
      .first_lead_celebrated_at == null;

  if (approved) {
    const [pc, ntw, cityRows, matched, leads, rec] = await Promise.all([
      supabase
        .from("broker_projects_view")
        .select("id", { count: "exact", head: true })
        .in("record_status", VISIBLE),
      supabase
        .from("broker_projects_view")
        .select("id", { count: "exact", head: true })
        .in("record_status", VISIBLE)
        .gte("created_at", weekAgo),
      supabase
        .from("broker_projects_view")
        .select("city")
        .in("record_status", VISIBLE)
        .not("city", "is", null),
      // Public pages where this realtor is the assigned agent (the lead path).
      supabase
        .from("public_projects_view")
        .select("public_page_id", { count: "exact", head: true })
        .eq("assigned_realtor_profile_id", profile.id),
      // Buyer inquiries attributed to them (organic steward + referral-link).
      supabase
        .from("project_leads")
        .select("id", { count: "exact", head: true })
        .eq("assigned_realtor_profile_id", profile.id),
      supabase
        .from("broker_projects_view")
        .select(
          "id, slug, project_name, builder_name, city, sales_status, price_from_public, price_to_public, hero_image_url",
        )
        .in("record_status", VISIBLE)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
    projectCount = pc.count ?? 0;
    newThisWeek = ntw.count ?? 0;
    cityCount = new Set((cityRows.data ?? []).map((r) => r.city as string)).size;
    matchedPages = matched.count ?? 0;
    buyerInquiries = leads.count ?? 0;
    recent = (rec.data as RailProject[] | null) ?? [];
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Welcome, {firstName}
          </h1>
          <p className="mt-1 text-slate-500">
            {approved
              ? "Turn new-home project updates into buyer inquiries — free, no referral fees, no brokerage change."
              : "Get verified to unlock broker-only project tools."}
          </p>
        </div>
        <ButtonLink href={approved ? "/dashboard/projects" : "/dashboard/verify"}>
          {approved ? "Browse projects" : "Start verification"}
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

      {profile.role === "realtor" && !allDone ? (
        <ActivationTracker steps={trackerSteps} />
      ) : null}

      {approved ? (
        <LeadPathStatus
          matchedPages={matchedPages}
          buyerInquiries={buyerInquiries}
        />
      ) : (
        <NextStepCard
          status={profile.verification_status}
          hasSubmitted={hasSubmittedVerification}
        />
      )}

      <GetStartedBanner />

      {approved ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={Building2} label="Active projects" value={projectCount} />
          <Stat icon={TrendingUp} label="New this week" value={newThisWeek} />
          <Stat icon={MapPin} label="Cities covered" value={cityCount} />
        </div>
      ) : null}

      <PlaybookCallout />

      <HomeSection
        label="Earn"
        accent="emerald"
        zone
        description="Commissions, referrals & rewards"
      >
        <ActionCard
          icon={Magnet}
          title="Get free leads"
          body="Add or update a new-home project to get matched as its agent — newer, active projects tend to draw the most buyer interest. Here's how to set up."
          href="/dashboard/get-free-leads"
          cta="Start getting leads"
          enabled
        />
        <ActionCard
          icon={Coins}
          title="Quick Wins"
          body="Get paid to refer renters to purpose-built rentals — the building's team handles the rest."
          href="/dashboard/quick-wins"
          cta="See who's paying"
          enabled={approved}
          lockedHint="Available after verification"
        />
        <ActionCard
          icon={Handshake}
          title="Developer Deals"
          body={
            ultra
              ? "Respond to developer deal requests — bulk buys, listing mandates, and full developments."
              : "Developer deal requests — bulk buys, listing mandates, full developments. Unlock with Ultra."
          }
          href="/dashboard/deal-desk"
          cta={ultra ? "Open Deal Desk" : "See what's inside"}
          enabled
          ultra={!ultra}
        />
        <ActionCard
          icon={ClipboardCheck}
          title="Buyer Matching"
          body={
            pro
              ? "Submit a hard-to-match buyer — matching inventory surfaces to you automatically."
              : "A Pro feature: submit a buyer mandate and let matching inventory come to you."
          }
          href={pro ? "/dashboard/buyer-mandates/new" : "/dashboard/upgrade"}
          cta={pro ? "New mandate" : "Unlock with Pro"}
          enabled={approved}
          lockedHint="Available after verification"
        />
        <ActionCard
          icon={FileText}
          title="Negotiate Terms"
          body="Ask developers for the commission, price, or incentive terms you need to close — and track every request."
          href="/dashboard/proposals"
          cta="Request terms"
          enabled={approved}
          lockedHint="Available after verification"
        />
        <ActionCard
          icon={Gift}
          title="Refer & earn"
          body="Invite a realtor — you both get a free month of Pro when they join."
          href="/dashboard/refer"
          cta="Get your invite link"
          enabled
        />
      </HomeSection>

      <HomeSection
        label="New Homes"
        accent="sky"
        description="Browse projects & broker portals"
      >
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
          icon={Link2}
          title="Lead Pages"
          body="See the project pages you're bound to and copy a direct referral link to hand a buyer — every lead it captures is attributed to you."
          href="/dashboard/lead-pages"
          cta="Open Lead Pages"
          enabled={approved}
          lockedHint="Available after verification"
        />
        <ActionCard
          icon={Inbox}
          title="Leads"
          body="Every buyer inquiry routed to you, in one inbox — contact details, the page it came from, and a pipeline to work each lead from new to won."
          href="/dashboard/leads"
          cta="Open your leads"
          enabled={approved}
          lockedHint="Available after verification"
        />
      </HomeSection>

      <HomeSection
        label="Account"
        accent="slate"
        description="Profile, submissions & updates"
      >
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
      </HomeSection>

      {approved && recent.length > 0 ? (
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
