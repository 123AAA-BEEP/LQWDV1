import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter your email and we’ll send you a reset link.
      </p>

      {message === "sent" ? (
        <Notice tone="success" className="mt-6">
          If an account exists for that email, a reset link is on its way.
        </Notice>
      ) : null}

      <form action={requestPasswordReset} className="mt-6 space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Button type="submit" className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="mt-4 text-sm text-slate-500">
        <Link href="/login" className="text-brand-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
