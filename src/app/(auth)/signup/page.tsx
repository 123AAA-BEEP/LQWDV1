import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { TITLE_LABELS } from "@/lib/types";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Sign up" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Create your LIQWD account
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Free for verified realtors. RECO verification is reviewed after signup.
      </p>

      {error ? (
        <Notice tone="error" className="mt-6">
          {error}
        </Notice>
      ) : null}

      <form action={signUp} className="mt-6 space-y-4">
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

        <Button type="submit" className="w-full">
          Sign up free
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
