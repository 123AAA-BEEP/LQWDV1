"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  submitAssignmentValuation,
  type MatchedProject,
} from "./actions";

/**
 * Assignment-valuation wizard — same one-question-per-screen conversion
 * skeleton as /match, tuned for pre-construction assignment sellers: the
 * soft questions (project, price paid, stage, APS clause) come before PII,
 * and every stage answer is useful routing signal for the assessing agent.
 */

const TOTAL_STEPS = 6;

const UNIT_TYPES = [
  { value: "condo", label: "Condo" },
  { value: "townhouse", label: "Townhome" },
  { value: "detached", label: "Detached" },
  { value: "other", label: "Other" },
];

const STAGES = [
  { value: "pre-occupancy", label: "Still under construction" },
  { value: "interim-occupancy", label: "In interim occupancy" },
  { value: "closing-soon", label: "Final closing is coming up" },
  { value: "not-sure", label: "Not sure" },
];

const APS_OPTIONS = [
  { value: "yes", label: "Yes — assignment is allowed" },
  { value: "no", label: "No / builder hasn't consented" },
  { value: "not-sure", label: "I'm not sure" },
];

function ChoiceCard({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-4 text-center text-sm font-medium transition-colors ${
        selected
          ? "border-brand-600 bg-brand-50 text-brand-800"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      {label}
    </button>
  );
}

export function AssignmentValueWizard({ source }: { source?: string }) {
  const [step, setStep] = useState(1);
  const [phase, setPhase] = useState<"form" | "sending" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<MatchedProject | null>(null);

  const [projectName, setProjectName] = useState("");
  const [city, setCity] = useState("");
  const [price, setPrice] = useState("");
  const [year, setYear] = useState("");
  const [unitType, setUnitType] = useState("");
  const [beds, setBeds] = useState("");
  const [stage, setStage] = useState("");
  const [aps, setAps] = useState("");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const submit = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Please tell us your name and email.");
      return;
    }
    setError(null);
    setPhase("sending");
    const fd = new FormData();
    fd.set("project_name", projectName);
    fd.set("city", city);
    fd.set("purchase_price", price);
    fd.set("purchase_year", year);
    fd.set("unit_type", unitType);
    fd.set("beds", beds);
    fd.set("stage", stage);
    fd.set("aps_assignment_clause", aps);
    fd.set("details", details);
    fd.set("owner_name", name);
    fd.set("owner_email", email);
    fd.set("owner_phone", phone);
    if (source) fd.set("source", source);
    const [result] = await Promise.all([
      submitAssignmentValuation(fd),
      new Promise((r) => setTimeout(r, 1200)),
    ]);
    if (result && "error" in result && result.error) {
      setError(result.error);
      setPhase("form");
      return;
    }
    setMatched(result && "project" in result ? (result.project ?? null) : null);
    setPhase("done");
  };

  if (phase === "sending") {
    return (
      <div className="py-16 text-center" role="status" aria-live="polite">
        <p className="text-2xl font-semibold text-ink">
          Preparing your assessment request…
        </p>
        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div role="status" aria-live="polite">
        <p className="text-2xl font-semibold text-ink">
          Request received — an assignment specialist is on it.
        </p>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          An agent who works pre-construction assignments will review your
          details and get back to you with a free, no-obligation assessment —
          usually within one business day. We&apos;ve emailed you a
          confirmation.
        </p>
        {matched?.slug ? (
          <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
            Good news: we track{" "}
            <Link
              href={`/projects/${matched.slug}`}
              className="font-medium underline underline-offset-2"
            >
              {matched.name}
            </Link>{" "}
            on LIQWD — the assessing agent starts with its live listing data.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-medium text-slate-400">
          Step {step} / {TOTAL_STEPS}
        </p>
      </div>

      {step === 1 ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">
            Which project did you buy in?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The development&apos;s name — we track 1,000+ projects and may
            already have its live pricing.
          </p>
          <div className="mt-5 space-y-4">
            <Field label="Project name" htmlFor="av_project">
              <Input
                id="av_project"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                maxLength={200}
                placeholder="e.g. Union City Tower 3"
              />
            </Field>
            <Field label="City" htmlFor="av_city">
              <Input
                id="av_city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={120}
                placeholder="e.g. Markham"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">
            What did you pay, and when?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your original purchase price is the anchor for what the assignment
            is worth today. Approximate is fine.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Purchase price" htmlFor="av_price">
              <Input
                id="av_price"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                maxLength={12}
                placeholder="e.g. 689,000"
              />
            </Field>
            <Field label="Year you signed" htmlFor="av_year">
              <Input
                id="av_year"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                maxLength={4}
                placeholder="e.g. 2022"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            What kind of unit is it?
          </legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {UNIT_TYPES.map((t) => (
              <ChoiceCard
                key={t.value}
                label={t.label}
                selected={unitType === t.value}
                onClick={() => {
                  setUnitType(t.value);
                  next();
                }}
              />
            ))}
          </div>
          <div className="mt-4 max-w-40">
            <Field label="Bedrooms (optional)" htmlFor="av_beds">
              <Input
                id="av_beds"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                maxLength={20}
                placeholder="e.g. 2+1"
              />
            </Field>
          </div>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            Where are things at?
          </legend>
          <p className="mt-1 text-sm text-slate-500">
            Timing changes both the price and the process.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {STAGES.map((s) => (
              <ChoiceCard
                key={s.value}
                label={s.label}
                selected={stage === s.value}
                onClick={() => {
                  setStage(s.value);
                  next();
                }}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 5 ? (
        <fieldset>
          <legend className="text-2xl font-semibold text-ink">
            Does your purchase agreement allow assignment?
          </legend>
          <p className="mt-1 text-sm text-slate-500">
            It&apos;s in your APS — many builders allow it with consent and a
            fee. &ldquo;Not sure&rdquo; is a completely normal answer.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {APS_OPTIONS.map((o) => (
              <ChoiceCard
                key={o.value}
                label={o.label}
                selected={aps === o.value}
                onClick={() => {
                  setAps(o.value);
                  next();
                }}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 6 ? (
        <div>
          <h2 className="text-2xl font-semibold text-ink">
            Where should your assessment go?
          </h2>
          <p className="mt-1 text-sm text-slate-500">Last step.</p>
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="av_name">
                <Input
                  id="av_name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                />
              </Field>
              <Field label="Email" htmlFor="av_email">
                <Input
                  id="av_email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={320}
                  autoComplete="email"
                />
              </Field>
            </div>
            <Field label="Phone (optional)" htmlFor="av_phone">
              <Input
                id="av_phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={40}
                autoComplete="tel"
              />
            </Field>
            <Field
              label="Anything else? (optional)"
              htmlFor="av_details"
              hint="Deposit paid so far, upgrades, closing date if you know it…"
            >
              <Textarea
                id="av_details"
                className="min-h-20"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={2000}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between">
        {step > 1 ? (
          <Button type="button" variant="secondary" onClick={back}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step === 1 ? (
          <Button type="button" onClick={next} disabled={!projectName.trim()}>
            Next
          </Button>
        ) : null}
        {step === 2 || step === 3 ? (
          <Button type="button" onClick={next}>
            Next
          </Button>
        ) : null}
        {step === 6 ? (
          <Button
            type="button"
            onClick={submit}
            disabled={!name.trim() || !email.trim()}
          >
            Get my free assessment →
          </Button>
        ) : null}
      </div>

      {step === 6 ? (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Free and no obligation. By submitting, you agree that LIQWD and the
          assessing agent may contact you about this request by email or
          phone. Your details are never sold, and nothing is listed anywhere
          without your say-so.
        </p>
      ) : null}
    </div>
  );
}
