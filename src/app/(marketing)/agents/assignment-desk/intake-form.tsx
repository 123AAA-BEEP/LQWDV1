"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitAssignmentIntake } from "./intake-actions";

/**
 * The seeding intake — deliberately NO signup wall. Capture the agent +
 * listing basics in two minutes; the thanks state walks them into signup and
 * verification (which is when the listing can actually go live on the gated
 * board).
 */
export function AssignmentIntakeForm({ source }: { source?: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6"
      >
        <p className="font-semibold text-emerald-900">
          Got it — you&apos;re on the founding list.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">
          We&apos;ll be in touch shortly. Want your listing live sooner? Create
          your free account and verify your licence now — verification is
          instant for most RECO agents, and your assignment can be on the board
          today.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/signup">Create your free account</ButtonLink>
          <ButtonLink href="/login" variant="secondary">
            I already have one
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("sending");
        setError(null);
        const result = await submitAssignmentIntake(formData);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
        }
      }}
      className="space-y-4"
    >
      {source ? <input type="hidden" name="source" value={source} /> : null}
      {/* Honeypot — hidden from people, irresistible to bots */}
      <div className="hidden" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name">
          <Input id="name" name="name" required maxLength={120} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required maxLength={320} />
        </Field>
        <Field label="Phone (optional)" htmlFor="phone">
          <Input id="phone" name="phone" maxLength={40} />
        </Field>
        <Field label="Brokerage (optional)" htmlFor="brokerage">
          <Input id="brokerage" name="brokerage" maxLength={160} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Project (optional)" htmlFor="project_name">
          <Input
            id="project_name"
            name="project_name"
            maxLength={200}
            placeholder="e.g. Cawthra Road Towns"
          />
        </Field>
        <Field label="City (optional)" htmlFor="city_region">
          <Input
            id="city_region"
            name="city_region"
            maxLength={120}
            placeholder="e.g. Mississauga"
          />
        </Field>
        <Field label="Asking price (optional)" htmlFor="assignment_price">
          <Input
            id="assignment_price"
            name="assignment_price"
            inputMode="numeric"
            maxLength={12}
            placeholder="$"
          />
        </Field>
      </div>

      <Field label="Anything else? (optional)" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          placeholder="Unit type, closing timeline, builder-consent status…"
        />
      </Field>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Reserve my founding listing"}
      </Button>
      <p className="text-xs leading-relaxed text-slate-400">
        Free for founding agents. Your listing only ever appears on the
        licence-gated board — never the public site — and every inquiry goes
        directly to you. By submitting you agree to our{" "}
        <Link href="/terms" className="underline">
          terms
        </Link>
        .
      </p>
    </form>
  );
}
