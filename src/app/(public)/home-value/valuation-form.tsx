"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { submitValuationRequest } from "./valuation-actions";

/**
 * The home-value request form. Deliberately honest: no fake instant number —
 * the promise is a free professional market assessment from a local licensed
 * agent, which is what actually gets prepared.
 */
export function ValuationForm({
  defaultCity,
  sourceCitySlug,
}: {
  defaultCity?: string;
  sourceCitySlug?: string;
}) {
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
          Request received — your assessment is being prepared.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-emerald-800">
          A licensed local agent will review recent sales around your property
          and get back to you with a free, no-obligation market assessment —
          usually within one business day. No spam, and your details are never
          sold.
        </p>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("sending");
        setError(null);
        const result = await submitValuationRequest(formData);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
        }
      }}
      className="space-y-4"
    >
      {sourceCitySlug ? (
        <input type="hidden" name="source_city_slug" value={sourceCitySlug} />
      ) : null}
      {/* Honeypot — hidden from people, irresistible to bots */}
      <div className="hidden" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Field label="Property address" htmlFor="address">
        <Input
          id="address"
          name="address"
          required
          maxLength={240}
          placeholder="e.g. 123 Main St"
          autoComplete="street-address"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" htmlFor="city">
          <Input
            id="city"
            name="city"
            maxLength={120}
            defaultValue={defaultCity ?? ""}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="Property type" htmlFor="property_type">
          <Select id="property_type" name="property_type" defaultValue="">
            <option value="">Select…</option>
            <option value="detached">Detached house</option>
            <option value="semi">Semi-detached</option>
            <option value="townhouse">Townhome</option>
            <option value="condo">Condo</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Bedrooms" htmlFor="beds">
          <Input id="beds" name="beds" maxLength={20} placeholder="e.g. 3" />
        </Field>
        <Field label="Bathrooms" htmlFor="baths">
          <Input id="baths" name="baths" maxLength={20} placeholder="e.g. 2.5" />
        </Field>
      </div>

      <Field
        label="When are you thinking of selling?"
        htmlFor="timeline"
      >
        <Select id="timeline" name="timeline" defaultValue="">
          <option value="">Select…</option>
          <option value="asap">As soon as possible</option>
          <option value="3-6-months">In 3–6 months</option>
          <option value="6-12-months">In 6–12 months</option>
          <option value="just-curious">Just curious what it&apos;s worth</option>
        </Select>
      </Field>

      <Field
        label="Anything else about the property? (optional)"
        htmlFor="details"
        hint="Renovations, parking, lot size, tenant situation — anything that affects value."
      >
        <Textarea id="details" name="details" maxLength={2000} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="owner_name">
          <Input id="owner_name" name="owner_name" required maxLength={120} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="owner_email">
          <Input
            id="owner_email"
            name="owner_email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
          />
        </Field>
      </div>
      <Field label="Phone (optional)" htmlFor="owner_phone">
        <Input id="owner_phone" name="owner_phone" maxLength={40} autoComplete="tel" />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Get my free assessment"}
      </Button>
      <p className="text-xs text-slate-500">
        Free and no-obligation. Prepared by a licensed Ontario agent — not an
        automated guess. Your details go only to the agent preparing your
        assessment.
      </p>
    </form>
  );
}
