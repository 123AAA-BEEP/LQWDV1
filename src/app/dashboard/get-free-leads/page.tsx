import type { Metadata } from "next";
import Link from "next/link";
import {
  Magnet,
  PlusCircle,
  FilePenLine,
  DoorOpen,
  TrendingUp,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import { OnboardingTrail } from "@/components/dashboard/onboarding/trail";

export const metadata: Metadata = { title: "Get free leads" };

// The repeatable setup → match → inquiry loop, in plain language.
const STEPS = [
  {
    title: "Add or update a project",
    body: "Submit a new project, or send an update on an existing one — fresh pricing, incentives, or availability.",
  },
  {
    title: "Get matched as its agent",
    body: "Once approved, you become the agent on that project's public page.",
  },
  {
    title: "Receive buyer inquiries",
    body: "Buyer inquiries from that page route to you, free — no referral fee, no brokerage change.",
  },
];

export default async function GetFreeLeadsPage() {
  const { profile } = await requireUserProfile();
  const approved = isApproved(profile);

  return (
    <div className="max-w-4xl space-y-8">
      <OnboardingTrail current="leads" />

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <Magnet className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Get free leads
          </h1>
          <p className="mt-1 max-w-xl text-slate-500">
            Become the agent on a project&apos;s public page and its buyer
            inquiries route to you — free, from your current brokerage. Here&apos;s
            how to get set up.
          </p>
        </div>
      </div>

      {!approved ? (
        <Notice tone="info">
          You can add and update projects now. Once your verification is
          approved, the buyer inquiries from your pages start routing to you.{" "}
          <Link href="/dashboard/verify" className="font-medium underline">
            Get verified →
          </Link>
        </Notice>
      ) : null}

      {/* Featured: new projects do best */}
      <Card className="overflow-hidden border-brand-200 bg-gradient-to-br from-brand-50 to-white">
        <CardBody className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              <TrendingUp className="size-3" strokeWidth={2} aria-hidden />
              Best for lead volume
            </span>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-ink">
              Add a new project
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Newer, active projects tend to draw the most buyer interest — so
              adding a fresh project is usually the fastest way to start
              receiving inquiries. Add one you already know, track, or are
              actively selling.
            </p>
          </div>
          <ButtonLink href="/dashboard/submit" className="shrink-0">
            <PlusCircle className="size-4" aria-hidden />
            Add a project
          </ButtonLink>
        </CardBody>
      </Card>

      {/* How it works */}
      <section>
        <Eyebrow as="h2">How free leads work</Eyebrow>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardBody>
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">
                    {step.body}
                  </p>
                </CardBody>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Other ways to get set up */}
      <section>
        <Eyebrow as="h2">Other ways to get set up</Eyebrow>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SetupCard
            icon={FilePenLine}
            title="Update a project"
            body="Open any project and suggest an update — refreshing pricing, incentives, or availability keeps its page active and current."
            href="/dashboard/projects"
            cta="Find a project to update"
            enabled={approved}
          />
          <SetupCard
            icon={DoorOpen}
            title="Add a broker portal link"
            body="Open a project and add its official broker portal so agents can register and transact — and the project page stays complete."
            href="/dashboard/projects"
            cta="Find a project"
            enabled={approved}
          />
        </div>
      </section>

      {/* Footer links */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-200 pt-6 text-sm">
        <Link
          href="/dashboard/lead-pages"
          className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline"
        >
          See your pages &amp; referral links
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
        <Link
          href="/dashboard/learn"
          className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:underline"
        >
          <BookOpen className="size-3.5" aria-hidden />
          New to pre-construction? Open the playbook
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-slate-400">
        LIQWD doesn&apos;t guarantee lead quantity, quality, or conversion.
        Newer, active, and better-maintained projects may generate more interest.
      </p>
    </div>
  );
}

function SetupCard({
  icon: Icon,
  title,
  body,
  href,
  cta,
  enabled,
}: {
  icon: typeof Magnet;
  title: string;
  body: string;
  href: string;
  cta: string;
  enabled: boolean;
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
              Available after verification
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
