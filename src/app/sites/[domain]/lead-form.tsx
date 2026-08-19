"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Radio } from "@/components/ui/field";
import { submitMicrositeLead } from "./actions";

/**
 * Microsite lead form — same quality bar as the main site's form. Rendered
 * twice per page (top + bottom), so ids are prefixed per instance.
 */
export function MicrositeLeadForm({
  idPrefix = "ms",
  domain,
  captureKey,
  ctaLabel,
  accentColor,
  compact = false,
}: {
  idPrefix?: string;
  domain: string;
  captureKey: string;
  ctaLabel: string;
  /** Brand-extracted button colour; falls back to the app palette. */
  accentColor?: string;
  /** Hero variant: tighter spacing, no message field — fits above the fold. */
  compact?: boolean;
}) {
  const id = (name: string) => `${idPrefix}_${name}`;
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  if (status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"
      >
        Thanks, you&apos;re on the list. Expect pricing, floor plans, and
        launch details as they&apos;re released.
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("sending");
        setError(null);
        const result = await submitMicrositeLead(formData);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
        }
      }}
      className={compact ? "space-y-3" : "space-y-4"}
    >
      <input type="hidden" name="domain" value={domain} />
      <input type="hidden" name="capture_key" value={captureKey} />
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Field label="Full name" htmlFor={id("name")}>
        <Input id={id("name")} name="lead_name" required autoComplete="name" maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor={id("email")}>
          <Input id={id("email")} name="lead_email" type="email" required autoComplete="email" maxLength={320} />
        </Field>
        <Field label="Phone" htmlFor={id("phone")}>
          <Input id={id("phone")} name="lead_phone" type="tel" required minLength={7} autoComplete="tel" maxLength={40} />
        </Field>
      </div>
      <Field label="Address" htmlFor={id("address")}>
        <Input
          id={id("address")}
          name="lead_address"
          autoComplete="street-address"
          maxLength={200}
        />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          Are you a real estate agent?
        </legend>
        <div className="mt-1.5 flex gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-1.5">
            <Radio name="is_realtor" value="no" required />
            No
          </label>
          <label className="flex items-center gap-1.5">
            <Radio name="is_realtor" value="yes" required />
            Yes
          </label>
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full rounded-xl shadow-sm transition hover:brightness-110"
        disabled={status === "sending"}
        style={accentColor ? { backgroundColor: accentColor } : undefined}
      >
        {status === "sending" ? "Sending…" : ctaLabel}
      </Button>
      {/* CASL express consent — affirmative, never pre-checked. */}
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500">
        <Checkbox name="casl_consent" required className="mt-0.5" />
        <span>
          I agree to receive emails, calls and texts about this project and
          similar new construction opportunities from LIQWD. I can withdraw
          my consent at any time. No spam, and my details go only to this
          project&apos;s representative.
        </span>
      </label>
    </form>
  );
}
