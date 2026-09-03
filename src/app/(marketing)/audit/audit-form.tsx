"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Field, Input, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { requestAudit, type AuditResult } from "./actions";
import type { AuditReport } from "@/lib/presence-audit";

export function AuditForm() {
  const [result, setResult] = useState<AuditResult | null>(null);

  if (result?.report) return <Report report={result.report} />;

  if (result?.queued) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
      >
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-5 shrink-0 text-emerald-700" aria-hidden />
          <div>
            <p className="font-semibold text-emerald-900">Got it. Your report is on its way.</p>
            <p className="mt-1 text-sm text-emerald-800">
              A real person is checking what Google shows for you. Expect it in your inbox
              within 24 hours.
            </p>
            <div className="mt-4">
              <ButtonLink href="/signup" size="sm">
                Create a free account meanwhile
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        const r = await requestAudit(formData);
        setResult(r);
      }}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {/* Honeypot — hidden from people, filled by bots. */}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input type="text" name="website_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Your name, as registered" htmlFor="name">
        <Input id="name" name="name" required autoComplete="name" placeholder="Jane Smith" />
      </Field>
      <Field label="Brokerage" htmlFor="brokerage">
        <Input id="brokerage" name="brokerage" required placeholder="Right at Home Realty" />
      </Field>
      <Field label="City" htmlFor="city">
        <Input id="city" name="city" required placeholder="Mississauga" />
      </Field>
      <Field label="Email for the report" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </Field>
      <label className="flex items-start gap-2 text-sm text-slate-600">
        <Checkbox name="marketing_consent" className="mt-0.5" />
        <span>
          Send me occasional tips from LIQWD on getting found by buyers. You can unsubscribe
          any time.
        </span>
      </label>
      {result?.error ? (
        <p role="alert" className="text-sm text-red-600">
          {result.error}
        </p>
      ) : null}
      <SubmitButton className="w-full" pendingLabel="Checking Google…">
        See what Google thinks of me
      </SubmitButton>
      <p className="text-xs leading-relaxed text-slate-500">
        Free, takes about a minute. We look only at your public Google listing. Your details
        are used to run and send this report and nothing else unless you tick the box. See our{" "}
        <Link href="/privacy" className="underline hover:text-slate-700">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}

function Report({ report }: { report: AuditReport }) {
  const fixes = report.findings.filter((f) => !f.ok);
  return (
    <div role="status" aria-live="polite" className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Your Google presence
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {report.score}
              <span className="text-lg text-slate-400">/100</span>
            </p>
          </div>
          {report.mapsUrl ? (
            <a
              href={report.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Open your listing on Google Maps ↗
            </a>
          ) : null}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={
              report.score >= 70
                ? "h-full rounded-full bg-emerald-500"
                : report.score >= 40
                  ? "h-full rounded-full bg-amber-500"
                  : "h-full rounded-full bg-red-500"
            }
            style={{ width: `${Math.max(4, report.score)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-slate-500">
          {fixes.length === 0
            ? "Nothing to fix from the outside. The next step is being found for more than your own name."
            : `${fixes.length} thing${fixes.length === 1 ? "" : "s"} to fix. Each one takes minutes.`}
        </p>
      </div>

      <ol className="space-y-2">
        {report.findings.map((f) => (
          <li
            key={f.key}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4"
          >
            {f.ok ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 size-5 shrink-0 text-red-500" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="font-medium text-ink">{f.title}</p>
              <p className="mt-0.5 text-sm text-slate-600">{f.detail}</p>
              {f.fix ? (
                <p className="mt-1 text-sm text-slate-700">
                  <span className="font-medium">Fix:</span> {f.fix}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-5">
        <div>
          <p className="font-semibold text-ink">A copy is in your inbox.</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Fix the red ones in an afternoon, or let LIQWD do it as part of your free page.
          </p>
        </div>
        <ButtonLink href="/signup" size="sm">
          Start free
        </ButtonLink>
      </div>
      <p className="text-xs text-slate-400">
        Checked {new Date(report.checkedAt).toLocaleDateString("en-CA")} from your public Google
        listing. Nothing here is an estimate.
      </p>
    </div>
  );
}
