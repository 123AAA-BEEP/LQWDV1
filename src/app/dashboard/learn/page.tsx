import type { Metadata } from "next";
import { BookOpen, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Eyebrow, SectionHeading } from "@/components/ui/heading";
import { OnboardingTrail } from "@/components/dashboard/onboarding/trail";
import {
  AGENT_CONCERNS,
  QUICK_FACTS_FIELDS,
  SALES_STEPS,
  QUALIFY_QUESTIONS,
  BUYER_MATCH,
  BUYER_OBJECTIONS,
  NEXT_COMMITMENTS,
  FOLLOWUP_SEQUENCE,
  PRECON_EXPLAINER,
} from "@/lib/training";

export const metadata: Metadata = { title: "Pre-construction playbook" };

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        {kicker ? <Eyebrow className="text-brand-600">{kicker}</Eyebrow> : null}
        <SectionHeading className="mt-1">{title}</SectionHeading>
      </div>
      {children}
    </section>
  );
}

export default function PlaybookPage() {
  return (
    <div className="max-w-3xl space-y-10">
      <OnboardingTrail current="playbook" />

      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          <BookOpen className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Pre-construction playbook
          </h1>
          <p className="mt-1 text-slate-500">
            A simple, practical guide for resale agents — understand a project,
            speak confidently with buyers, and convert pre-construction
            opportunities without the guesswork.
          </p>
        </div>
      </div>

      {/* Reassurance — the concern, addressed */}
      <Card>
        <CardBody className="space-y-4">
          <p className="text-sm font-medium text-ink">
            New to pre-construction? You don&apos;t need to be an expert.
          </p>
          <ul className="space-y-3">
            {AGENT_CONCERNS.map((c) => (
              <li key={c.concern} className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-brand-600"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <p className="text-sm leading-relaxed text-slate-600">
                  <span className="font-medium text-slate-800">
                    “{c.concern}”
                  </span>{" "}
                  {c.answer}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* What every project page gives you */}
      <Section
        kicker="Part 1"
        title="What every project page gives you"
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Every project on LIQWD is built as a quick-facts sheet, so you can get
          oriented in minutes. Here&apos;s what to look for:
        </p>
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {QUICK_FACTS_FIELDS.map((f) => (
                <li key={f.section} className="grid gap-1 px-5 py-3 sm:grid-cols-3">
                  <span className="text-sm font-medium text-slate-800">
                    {f.section}
                  </span>
                  <span className="text-sm text-slate-500 sm:col-span-2">
                    {f.include}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </Section>

      {/* The process */}
      <Section kicker="Part 2" title="Your sales process, start to finish">
        <ol className="space-y-5">
          {SALES_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Qualify */}
      <Section title="Five questions to qualify a lead">
        <Card>
          <CardBody>
            <ul className="space-y-2">
              {QUALIFY_QUESTIONS.map((q) => (
                <li key={q} className="flex gap-2.5 text-sm text-slate-700">
                  <span aria-hidden className="text-brand-500">
                    →
                  </span>
                  {q}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </Section>

      {/* Position */}
      <Section title="How to explain pre-construction">
        <blockquote className="rounded-2xl border border-brand-100 bg-brand-50/60 p-5 text-sm leading-relaxed text-slate-700">
          {PRECON_EXPLAINER}
        </blockquote>
      </Section>

      {/* Match the buyer */}
      <Section title="Match the buyer to the project">
        <div className="grid gap-3 sm:grid-cols-3">
          {BUYER_MATCH.map((b) => (
            <Card key={b.type}>
              <CardBody className="space-y-1.5">
                <p className="text-sm font-semibold text-ink">{b.type}</p>
                <p className="text-sm leading-relaxed text-slate-500">
                  {b.body}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </Section>

      {/* Objections */}
      <Section title="Handle common objections">
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {BUYER_OBJECTIONS.map((o) => (
                <li key={o.objection} className="space-y-1 px-5 py-3.5">
                  <p className="text-sm font-medium text-slate-800">
                    “{o.objection}”
                  </p>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {o.response}
                  </p>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </Section>

      {/* Next commitment */}
      <Section title="Close every conversation on a next step">
        <ul className="flex flex-wrap gap-2">
          {NEXT_COMMITMENTS.map((c) => (
            <li
              key={c}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              {c}
            </li>
          ))}
        </ul>
      </Section>

      {/* Follow-up */}
      <Section title="A follow-up rhythm that converts">
        <Card>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-100">
              {FOLLOWUP_SEQUENCE.map((s) => (
                <li
                  key={s.when}
                  className="grid gap-1 px-5 py-3 sm:grid-cols-3"
                >
                  <span className="text-sm font-semibold text-brand-700">
                    {s.when}
                  </span>
                  <span className="text-sm text-slate-600 sm:col-span-2">
                    {s.action}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </Section>
    </div>
  );
}
