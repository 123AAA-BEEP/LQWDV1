"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Radio, Textarea } from "@/components/ui/field";
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
}: {
  idPrefix?: string;
  domain: string;
  captureKey: string;
  ctaLabel: string;
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
        Thanks — you&apos;re on the list. Expect pricing, floor plans, and
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
      className="space-y-4"
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
      <Field label="Message (optional)" htmlFor={id("message")}>
        <Textarea id={id("message")} name="message" className="min-h-16" maxLength={2000} />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          Are you a real estate agent? <span aria-hidden>*</span>
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
      <Button type="submit" size="lg" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : ctaLabel}
      </Button>
      <p className="text-xs leading-relaxed text-slate-500">
        No spam — your details go only to this project&apos;s representative.
        By submitting, you agree to be contacted about this project by email
        or phone.
      </p>
    </form>
  );
}
