"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitAgentReview } from "./review-actions";

/** Public "review this agent" form — trimmed AgentContactForm cousin. */
export function AgentReviewForm({
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
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  if (status === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
      >
        Thanks — your review has been received. We verify every review before
        it&apos;s published, so it will appear on {firstName}&apos;s profile
        once approved.
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        setStatus("sending");
        setError(null);
        const result = await submitAgentReview(formData);
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
      <div className="hidden" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Your rating
        </span>
        <input type="hidden" name="rating" value={rating || ""} />
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              aria-pressed={rating === n}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  (hover || rating) >= n
                    ? "fill-amber-400 text-amber-400"
                    : "text-slate-300",
                )}
                strokeWidth={1.5}
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="reviewer_name">
          <Input id="reviewer_name" name="reviewer_name" required maxLength={120} />
        </Field>
        <Field label="Your email" htmlFor="reviewer_email">
          <Input
            id="reviewer_email"
            name="reviewer_email"
            type="email"
            required
            maxLength={320}
          />
        </Field>
      </div>
      <Field
        label="What did you work on together? (optional)"
        htmlFor="worked_on"
      >
        <Input
          id="worked_on"
          name="worked_on"
          maxLength={200}
          placeholder="e.g. Pre-construction townhome in Mississauga"
        />
      </Field>
      <Field label="Your review" htmlFor="body">
        <Textarea
          id="body"
          name="body"
          rows={5}
          required
          minLength={20}
          maxLength={2000}
          placeholder="How was working with them? A couple of sentences helps other buyers."
        />
      </Field>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={status === "sending" || rating === 0}>
        {status === "sending" ? "Submitting…" : "Submit review"}
      </Button>
      <p className="text-xs leading-relaxed text-slate-400">
        Reviews are verified before publishing. Please only review an agent
        you&apos;ve genuinely worked with — one review per client.
      </p>
    </form>
  );
}
