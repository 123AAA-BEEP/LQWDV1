import type { Metadata } from "next";
import { Notice } from "@/components/ui/notice";
import { LoginTabs } from "@/components/auth/login-tabs";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    redirect?: string;
    role?: string;
    claim?: string;
  }>;
}) {
  const { error, message, redirect, role, claim } = await searchParams;

  return (
    <div>
      {message === "check-email" ? (
        <Notice tone="success" className="mb-6">
          {claim === "1" ? (
            <>
              <span className="font-semibold">
                One more step — check your email.
              </span>{" "}
              Click the confirmation link we just sent and you&apos;ll land right
              back on your listing, ready to claim.
            </>
          ) : (
            "Check your email to confirm your account, then log in."
          )}
        </Notice>
      ) : null}
      {error ? (
        <Notice tone="error" className="mb-6">
          {error}
        </Notice>
      ) : null}

      <LoginTabs
        defaultRole={role === "developer" ? "developer" : "agent"}
        redirect={redirect ?? "/dashboard"}
      />
    </div>
  );
}
