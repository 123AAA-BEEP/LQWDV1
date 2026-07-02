import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { getAdminQueueCounts } from "@/lib/admin-counts";

export const metadata: Metadata = { title: "Admin overview" };
export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  // Same counts source as the nav badges, so the two never disagree.
  const counts = await getAdminQueueCounts();

  const cards = [
    {
      label: "New leads",
      count: counts["/dashboard/admin/leads"],
      href: "/dashboard/admin/leads",
    },
    {
      label: "Invite drafts to review",
      count: counts["/dashboard/admin/invites"],
      href: "/dashboard/admin/invites",
    },
    {
      label: "Pending verifications",
      count: counts["/dashboard/admin/verifications"],
      href: "/dashboard/admin/verifications",
    },
    {
      label: "Submissions to review",
      count: counts["/dashboard/admin/submissions"],
      href: "/dashboard/admin/submissions",
    },
    {
      label: "Update requests",
      count: counts["/dashboard/admin/updates"],
      href: "/dashboard/admin/updates",
    },
    {
      label: "Proposals to review",
      count: counts["/dashboard/admin/proposals"],
      href: "/dashboard/admin/proposals",
    },
    {
      label: "RFP responses",
      count: counts["/dashboard/admin/rfps"],
      href: "/dashboard/admin/rfps",
    },
    {
      label: "Rental referrals",
      count: counts["/dashboard/admin/referrals"],
      href: "/dashboard/admin/referrals",
    },
    {
      label: "Media candidates",
      count: counts["/dashboard/admin/media-candidates"],
      href: "/dashboard/admin/media-candidates",
    },
    {
      label: "New suggestions",
      count: counts["/dashboard/admin/suggestions"],
      href: "/dashboard/admin/suggestions",
    },
    {
      label: "Email intake errors",
      count: counts["/dashboard/admin/email-intake"],
      href: "/dashboard/admin/email-intake",
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
