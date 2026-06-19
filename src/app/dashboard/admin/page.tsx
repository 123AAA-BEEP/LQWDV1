import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin overview" };
export const dynamic = "force-dynamic";

async function pendingCount(
  table: string,
  statuses: string[],
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .in("status", statuses);
  return count ?? 0;
}

export default async function AdminOverview() {
  const [
    verifications,
    submissions,
    updates,
    proposals,
    rfpResponses,
    rentalReferrals,
    mediaCandidates,
    suggestions,
  ] = await Promise.all([
    pendingCount("verification_requests", ["pending"]),
    pendingCount("property_submissions", ["pending_review", "needs_changes"]),
    pendingCount("property_update_requests", ["pending_review", "needs_changes"]),
    pendingCount("project_proposals", ["submitted", "under_review"]),
    pendingCount("deal_rfp_proposals", ["submitted"]),
    pendingCount("rental_referrals", ["new", "received", "in_progress"]),
    pendingCount("project_media_candidates", ["pending"]),
    pendingCount("platform_suggestions", ["new"]),
  ]);

  const cards = [
    {
      label: "Pending verifications",
      count: verifications,
      href: "/dashboard/admin/verifications",
    },
    {
      label: "Submissions to review",
      count: submissions,
      href: "/dashboard/admin/submissions",
    },
    {
      label: "Update requests",
      count: updates,
      href: "/dashboard/admin/updates",
    },
    {
      label: "Proposals to review",
      count: proposals,
      href: "/dashboard/admin/proposals",
    },
    {
      label: "RFP responses",
      count: rfpResponses,
      href: "/dashboard/admin/rfps",
    },
    {
      label: "Rental referrals",
      count: rentalReferrals,
      href: "/dashboard/admin/referrals",
    },
    {
      label: "Media candidates",
      count: mediaCandidates,
      href: "/dashboard/admin/media-candidates",
    },
    {
      label: "New suggestions",
      count: suggestions,
      href: "/dashboard/admin/suggestions",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Link key={c.href} href={c.href}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardBody>
              <p className="text-sm text-slate-500">{c.label}</p>
              <p className="mt-2 text-3xl font-semibold text-ink">{c.count}</p>
              <p className="mt-1 text-xs text-brand-700">Open queue →</p>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
