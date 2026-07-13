"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { contactAgent } from "./contact-actions";

/** "Work with {agent}" form on the public profile — trimmed LeadForm cousin. */
export function AgentContactForm({
  profileId,
  firstName,
}: {
  profileId: string;
  firstName: string;
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
        Thanks — your message is on its way to {firstName}. They&apos;ll be in
        touch shortly.
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("sending");
        setError(null);
        const result = await contactAgent(formData);
        if (result?.error) {
          setError(result.error);
          setStatus("error");
        } else {
          setStatus("done");
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="profile_id" value={profileId} />
      {/* Honeypot — hidden from people, irresistible to bots */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="contact_name">
          <Input id="contact_name" name="name" required autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="contact_email">
          <Input
            id="contact_email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
      </div>
      <Field label="Phone (optional)" htmlFor="contact_phone">
        <Input id="contact_phone" name="phone" autoComplete="tel" />
      </Field>
      <Field label="What are you looking for?" htmlFor="contact_message">
        <Textarea
          id="contact_message"
          name="message"
          placeholder="e.g. Pre-construction townhome in Mississauga, budget around $900K…"
        />
      </Field>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full sm:w-auto" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : `Message ${firstName}`}
      </Button>
      <p className="text-xs leading-relaxed text-slate-500">
        Your details go only to {firstName} — no spam, ever. See our{" "}
        <a href="/privacy" className="underline hover:text-slate-700">
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
