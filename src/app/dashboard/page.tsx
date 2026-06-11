import type { Metadata } from "next";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardHome() {
  const { profile } = await requireUserProfile();
  const approved = isApproved(profile);
  const firstName = profile.first_name ?? "there";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 text-slate-500">
          {approved
            ? "Browse active new-home projects and work your opportunities."
            : "Get verified to unlock broker-only project tools."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          title="Browse projects"
          body="Search active new-home projects across Ontario."
          href="/dashboard/projects"
          cta="View projects"
          enabled={approved}
          lockedHint="Available after verification"
        />
        <ActionCard
          title="Submit a project"
          body="Add a new project for admin review."
          href="/dashboard/submit"
          cta="Submit project"
          enabled
        />
        <ActionCard
          title={approved ? "Your profile" : "Get verified"}
          body={
            approved
              ? "Update your details and brokerage info."
              : "Submit your RECO registration details to verify."
          }
          href={approved ? "/dashboard/profile" : "/dashboard/verify"}
          cta={approved ? "Edit profile" : "Start verification"}
          enabled
        />
      </div>
    </div>
  );
}

function ActionCard({
  title,
  body,
  href,
  cta,
  enabled,
  lockedHint,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  enabled: boolean;
  lockedHint?: string;
}) {
  return (
    <Card>
      <CardBody className="flex h-full flex-col">
        <h2 className="font-semibold text-ink">{title}</h2>
        <p className="mt-1 flex-1 text-sm text-slate-500">{body}</p>
        <div className="mt-4">
          {enabled ? (
            <ButtonLink href={href} size="sm" variant="secondary">
              {cta}
            </ButtonLink>
          ) : (
            <span className="text-xs font-medium text-slate-400">
              {lockedHint}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
