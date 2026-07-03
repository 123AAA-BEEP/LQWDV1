"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Radio, Select, Textarea } from "@/components/ui/field";
import { submitLead } from "./actions";

export function LeadForm({
  projectId,
  publicPageId,
  ctaText,
  refCode,
  rental = false,
}: {
  projectId: string;
  publicPageId: string;
  ctaText: string;
  /** Referral code from `?ref=` — attributes the lead to the sharing realtor. */
  refCode?: string;
  /** Rental buildings ask renter questions (move-in, beds) instead of buyer ones. */
  rental?: boolean;
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
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        Thanks — your request has been received. A representative will be in
        touch shortly.
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("sending");
        setError(null);
        const result = await submitLead(formData);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="project_id" value={projectId} />
      <input type="hidden" name="public_page_id" value={publicPageId} />
      {refCode ? <input type="hidden" name="ref" value={refCode} /> : null}
      <Field label="Full name" htmlFor="lead_name">
        <Input id="lead_name" name="lead_name" required autoComplete="name" />
      </Field>
      <Field label="Email" htmlFor="lead_email">
        <Input
          id="lead_email"
          name="lead_email"
          type="email"
          required
          autoComplete="email"
        />
      </Field>
      <Field label="Phone (optional)" htmlFor="lead_phone">
        <Input id="lead_phone" name="lead_phone" autoComplete="tel" />
      </Field>
      {rental ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Move-in" htmlFor="move_in">
            <Select id="move_in" name="move_in" defaultValue="">
              <option value="">Flexible</option>
              <option value="ASAP">ASAP</option>
              <option value="1–3 months">1–3 months</option>
              <option value="3–6 months">3–6 months</option>
              <option value="6+ months">6+ months</option>
            </Select>
          </Field>
          <Field label="Bedrooms" htmlFor="beds">
            <Select id="beds" name="beds" defaultValue="">
              <option value="">Any</option>
              <option value="Studio">Studio</option>
              <option value="1 bed">1</option>
              <option value="2 bed">2</option>
              <option value="3+ bed">3+</option>
            </Select>
          </Field>
        </div>
      ) : null}
      <Field label="Message (optional)" htmlFor="message">
        <Textarea id="message" name="message" />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-slate-700">
          Are you a real estate agent?
        </legend>
        <div className="mt-1.5 flex gap-4 text-sm text-slate-600">
          <label className="flex items-center gap-1.5">
            <Radio name="is_realtor" value="no" defaultChecked />
            No
          </label>
          <label className="flex items-center gap-1.5">
            <Radio name="is_realtor" value="yes" />
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
        className="w-full"
        disabled={status === "sending"}
      >
        {status === "sending" ? "Sending…" : ctaText}
      </Button>
      <p className="text-xs leading-relaxed text-slate-500">
        Your details go only to this project&apos;s representative — no spam,
        ever.
      </p>
    </form>
  );
}
