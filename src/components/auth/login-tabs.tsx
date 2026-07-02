"use client";

import { useState } from "react";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { signIn } from "@/app/(auth)/actions";

type Role = "agent" | "developer";

const COPY: Record<Role, { sub: string; signupHref: string; signupLabel: string }> = {
  agent: {
    sub: "The broker portal for new homes in Ontario.",
    signupHref: "/signup",
    signupLabel: "Create an account",
  },
  developer: {
    sub: "Reach Ontario's verified agents and buyers for your project.",
    signupHref: "/signup?role=developer",
    signupLabel: "List your project",
  },
};

export function LoginTabs({
  defaultRole = "agent",
  redirect,
}: {
  defaultRole?: Role;
  redirect: string;
}) {
  const [role, setRole] = useState<Role>(defaultRole);
  const copy = COPY[role];
  const claiming = redirect.startsWith("/claim/");

  return (
    <div>
      {claiming ? (
        <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">
            Log in to claim your listing
          </p>
          <p className="mt-0.5 text-sm text-brand-700">
            You&apos;ll be taken straight back to your claim after logging in.
          </p>
        </div>
      ) : null}

      <h1 className="text-2xl font-semibold tracking-tight text-ink">Log in to LIQWD</h1>
      <p className="mt-1 text-sm text-slate-500">{copy.sub}</p>

      {/* Role toggle — login itself is identical; this sets context + sign-up link. */}
      <div
        role="tablist"
        aria-label="Account type"
        className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1"
      >
        {(["agent", "developer"] as Role[]).map((r) => (
          <button
            key={r}
            role="tab"
            aria-selected={role === r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              role === r
                ? "bg-white text-ink shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {r === "agent" ? "Real estate agent" : "Developer"}
          </button>
        ))}
      </div>

      <form action={signIn} className="mt-6 space-y-4">
        <input type="hidden" name="redirect" value={redirect} />
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
        <SubmitButton className="w-full" pendingLabel="Logging in…">
          Log in
        </SubmitButton>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          Forgot password?
        </Link>
        {/* Keep the claim context when they realise they need an account. */}
        <Link
          href={
            claiming
              ? `/signup?next=${encodeURIComponent(redirect)}`
              : copy.signupHref
          }
          className="text-brand-700 hover:underline"
        >
          {claiming ? "Create an account & claim" : copy.signupLabel}
        </Link>
      </div>
    </div>
  );
}
