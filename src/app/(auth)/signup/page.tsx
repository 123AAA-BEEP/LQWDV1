import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
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
  // Self-serve by default: verification is step one for every new agent, so
  // the account lands on the certificate upload unless a flow (claims, ref
  // links) asked for somewhere specific.
  const effectiveNext = safeNext || "/dashboard/verify";
  // Claim handoffs: off-market listings (/claim/{token}) and prospect agent
  // pages (/realtors/{slug}/claim) both route back after account creation.
  const claiming =
    safeNext.startsWith("/claim/") ||
    /^\/realtors\/[^/]+\/claim$/.test(safeNext);

  return (
    <div>
      {claiming ? (
        <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-sm font-semibold text-brand-800">
            Step 1 — create your free account
          </p>
          <p className="mt-0.5 text-sm text-brand-700">
            Then you&apos;ll be taken straight back to finish your claim.
          </p>
        </div>
      ) : null}

      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        Create your LIQWD account
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Free for verified realtors. Next step: verify in minutes with your RECO
        certificate.
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
        <input type="hidden" name="next" value={effectiveNext} />
        {/* Three fields. Brokerage, phone, title and the RECO number are
            collected by the certificate upload and the profile, not here. */}
        <Field label="Full name, as registered with RECO" htmlFor="full_name">
          <Input
            id="full_name"
            name="full_name"
            required
            autoComplete="name"
            placeholder="Jane Smith"
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>

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
          prefetch={false}
          className="text-brand-700 hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
