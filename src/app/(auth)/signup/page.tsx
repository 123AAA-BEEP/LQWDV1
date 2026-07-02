import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { TITLE_LABELS } from "@/lib/types";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ref?: string; next?: string }>;
}) {
  const { error, ref, next } = await searchParams;
  const referralCode = (ref ?? "").trim().toUpperCase();
  // Only carry a safe, in-app relative path (open-redirect guard).
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "";
  const claiming = safeNext.startsWith("/claim/");

  return (
    <div>
      {claiming ? (
        <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">
            Step 1 — create your free account
          </p>
          <p className="mt-0.5 text-sm text-brand-700">
            Then you&apos;ll be taken straight back to claim your listing.
          </p>
        </div>
      ) : null}

      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Create your LIQWD account
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Free for verified realtors. RECO verification is reviewed after signup.
      </p>

      {referralCode ? (
        <Notice tone="success" className="mt-6">
          You were invited by a colleague. Sign up and you both earn rewards.
        </Notice>
      ) : null}

      {error ? (
        <Notice tone="error" className="mt-6">
          {error}
        </Notice>
      ) : null}

      <form action={signUp} className="mt-6 space-y-4">
        {referralCode ? (
          <input type="hidden" name="ref" value={referralCode} />
        ) : null}
        {safeNext ? <input type="hidden" name="next" value={safeNext} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="first_name">
            <Input
              id="first_name"
              name="first_name"
              required
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name" htmlFor="last_name">
            <Input
              id="last_name"
              name="last_name"
              required
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>

        <Field label="Phone" htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
          />
        </Field>

        <Field label="Brokerage" htmlFor="brokerage_name">
          <Input
            id="brokerage_name"
            name="brokerage_name"
            required
            autoComplete="organization"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="title">
            <Select id="title" name="title" required defaultValue="">
              <option value="" disabled>
                Select…
              </option>
              {Object.entries(TITLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="RECO registration #"
            htmlFor="reco_registration_number"
          >
            <Input
              id="reco_registration_number"
              name="reco_registration_number"
              required
            />
          </Field>
        </div>

        <Field
          label="Password"
          htmlFor="password"
          hint="At least 8 characters."
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        <SubmitButton className="w-full" pendingLabel="Creating your account…">
          Sign up free
        </SubmitButton>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href={
            safeNext
              ? `/login?redirect=${encodeURIComponent(safeNext)}`
              : "/login"
          }
          className="text-brand-700 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
