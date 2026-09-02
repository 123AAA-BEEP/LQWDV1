import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronRight, ClipboardCheck } from "lucide-react";
import { requireUserProfile, isApproved, isDeveloper } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { cn } from "@/lib/cn";
import {
  ROADMAP_STEPS,
  MODULES,
  SUITE_ORDER,
  type PlaybookModule,
  type RoadmapStep,
} from "@/lib/playbooks/catalog";

export const metadata: Metadata = { title: "Marketing plan" };
export const dynamic = "force-dynamic";

/**
 * The realtor-facing playbook tier (agent-panel UX reorg, Phase 4): the
 * guided roadmap with each step's state computed from the agent's REAL
 * data, then the module cards grouped by suite. Copy comes straight from
 * src/lib/playbooks/catalog.ts (the founder's iteration surface); internal
 * codenames never render here. Roadmap order is a recommendation ("Best
 * after"), not a lock — the one hard gate (ads need a landing page) says
 * why in plain language. Paid modules are visible, labeled, never nagging.
 */

type StepState = "done" | "next" | "open" | "coming";

/** Where each roadmap step is done today. Steps without one aren't built yet. */
const STEP_HREF: Record<string, string> = {
  brand: "/dashboard/profile",
  website: "/dashboard/my-page",
};

type Tier = RoadmapStep["tier"] | PlaybookModule["tier"];
const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  paid: "Paid",
  premium: "Premium",
  mixed: "Free + paid",
};
const tierTone = (t: Tier) =>
  t === "free" ? "success" : t === "premium" ? "brand" : t === "mixed" ? "neutral" : "warning";

export default async function MarketingPlanPage() {
  const { profile } = await requireUserProfile();

  if (isDeveloper(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Marketing plan</h1>
        <Card>
          <CardBody className="text-center text-sm text-slate-500">
            The marketing plan is for realtor accounts.
          </CardBody>
        </Card>
      </div>
    );
  }

  const approved = isApproved(profile);
  const supabase = await createClient();
  const { count: pendingCount } = await supabase
    .from("approval_items")
    .select("id", { count: "exact", head: true })
    .eq("subject_kind", "realtor")
    .eq("subject_id", profile.id)
    .in("status", ["staged", "triaged"]);
  const pending = pendingCount ?? 0;

  // Step state from CURRENT data — the same signals Home uses.
  const profileDone = Boolean(
    profile.first_name && profile.brokerage_name && profile.avatar_url,
  );
  const websiteOn = profile.is_public_profile_enabled === true;
  const base: Record<string, StepState> = {
    brand: profileDone ? "done" : "open",
    website: websiteOn ? "done" : "open",
    google: "coming",
    content: "coming",
    domain: "coming",
    leads: "coming",
    story: "coming",
  };
  const firstOpen = ROADMAP_STEPS.find((s) => base[s.id] === "open");
  const stateOf = (id: string): StepState =>
    firstOpen?.id === id ? "next" : (base[id] ?? "coming");
  const doneCount = ROADMAP_STEPS.filter((s) => base[s.id] === "done").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Marketing plan</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            A guided path, free steps first, paid steps marked. Follow it in
            order for the easiest wins, or skip ahead if you know what you&apos;re
            doing. Everything we draft for you waits for your OK before it goes
            anywhere.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.round((doneCount / ROADMAP_STEPS.length) * 100)}%` }}
            />
          </div>
          <span className="tabular-nums">
            {doneCount} of {ROADMAP_STEPS.length} steps done
          </span>
        </div>
      </div>

      {pending > 0 ? (
        <Link
          href="/dashboard/approvals"
          className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 transition-colors hover:bg-brand-50"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-100">
              <ClipboardCheck className="size-5 text-brand-700" strokeWidth={1.75} aria-hidden />
            </span>
            <span>
              <span className="block font-semibold text-ink">
                {pending} draft{pending === 1 ? "" : "s"} waiting for your OK
              </span>
              <span className="block text-sm text-slate-600">
                Nothing goes out until you approve it.
              </span>
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-brand-700" aria-hidden />
        </Link>
      ) : null}

      {!approved ? (
        <Notice tone="info">
          Your public page goes live once your RECO verification is approved.
          Finish your brand now so it&apos;s ready the moment you are.{" "}
          <Link href="/dashboard/verify" className="font-medium underline">
            Check verification
          </Link>
        </Notice>
      ) : null}

      {/* ---- The roadmap ---------------------------------------------------- */}
      <section aria-labelledby="roadmap">
        <h2
          id="roadmap"
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
        >
          Your path
        </h2>
        <ol className="space-y-3">
          {ROADMAP_STEPS.map((s, i) => {
            const st = stateOf(s.id);
            const prev = i > 0 ? ROADMAP_STEPS[i - 1] : null;
            const nudge =
              prev && (st === "open" || st === "next") && base[prev.id] !== "done"
                ? prev.title
                : null;
            const href = STEP_HREF[s.id];
            return (
              <li
                key={s.id}
                className={cn(
                  "flex flex-wrap items-start gap-4 rounded-2xl border p-5",
                  st === "next"
                    ? "border-brand-200 bg-brand-50/60"
                    : st === "done"
                      ? "border-emerald-200 bg-white"
                      : st === "coming"
                        ? "border-slate-200 bg-slate-50/60"
                        : "border-slate-200 bg-white",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    st === "done"
                      ? "bg-emerald-600 text-white"
                      : st === "next"
                        ? "bg-brand-600 text-white"
                        : "bg-slate-200 text-slate-600",
                  )}
                  aria-label={st === "done" ? "Done" : `Step ${s.n}`}
                >
                  {st === "done" ? (
                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                  ) : (
                    s.n
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {s.title}
                    <Badge tone={tierTone(s.tier)}>{TIER_LABEL[s.tier]}</Badge>
                    {st === "next" ? (
                      <Badge tone="brand">Do this next</Badge>
                    ) : st === "coming" ? (
                      <Badge tone="neutral">Coming soon</Badge>
                    ) : null}
                  </p>
                  <p
                    className={cn(
                      "mt-1 max-w-2xl text-sm leading-relaxed",
                      st === "coming" ? "text-slate-500" : "text-slate-600",
                    )}
                  >
                    {s.body}
                  </p>
                  {s.hardGate ? (
                    <p className="mt-1.5 text-xs font-medium text-amber-700">{s.hardGate}</p>
                  ) : null}
                  {nudge ? (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Best after: {nudge}. You can still do this now.
                    </p>
                  ) : null}
                </div>
                {href && st !== "coming" ? (
                  <ButtonLink
                    href={href}
                    size="sm"
                    variant={st === "done" ? "secondary" : undefined}
                    className="shrink-0"
                  >
                    {st === "done" ? "Review" : "Open"}
                  </ButtonLink>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ---- The modules, by suite ------------------------------------------ */}
      {SUITE_ORDER.map((suite) => (
        <section key={suite} aria-label={suite}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            {suite}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.filter((m) => m.suite === suite).map((m) => (
              <ModuleCard key={m.tool} m={m} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-slate-400">
        Every draft these tools make lands in{" "}
        <Link href="/dashboard/approvals" className="font-medium text-slate-600 hover:underline">
          Approvals
        </Link>{" "}
        first. Nothing is published, posted, or sent without you.
      </p>
    </div>
  );
}

function ModuleCard({ m }: { m: PlaybookModule }) {
  const available = Boolean(m.todayHref);
  const step = ROADMAP_STEPS.find((s) => s.id === m.bestAfter);
  return (
    <Card>
      <CardBody className={cn("flex h-full flex-col gap-2 p-4", !available && "opacity-80")}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold leading-snug text-ink">{m.headline}</p>
          <Badge tone={tierTone(m.tier)}>{TIER_LABEL[m.tier]}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">{m.body}</p>
        <p className="text-xs font-medium text-slate-500">{m.anchor}</p>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          {available ? (
            <ButtonLink href={m.todayHref!} size="sm" variant="secondary">
              Open
            </ButtonLink>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              {m.status === "needs_api" ? "Waiting on platform approval" : "Coming soon"}
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            {step ? `Best after: ${step.title}` : "Start here"}
          </span>
        </div>
      </CardBody>
    </Card>
  );
}
