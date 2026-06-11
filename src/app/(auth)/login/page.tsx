import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; redirect?: string }>;
}) {
  const { error, message, redirect } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Log in to LIQWD
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        The broker portal for new homes in Ontario.
      </p>

      {message === "check-email" ? (
        <Notice tone="success" className="mt-6">
          Check your email to confirm your account, then log in.
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="error" className="mt-6">
          {error}
        </Notice>
      ) : null}

      <form action={signIn} className="mt-6 space-y-4">
        <input type="hidden" name="redirect" value={redirect ?? "/dashboard"} />
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-brand-700 hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}
