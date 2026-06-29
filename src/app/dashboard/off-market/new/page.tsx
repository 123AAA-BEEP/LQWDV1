import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { ListingForm } from "@/components/dashboard/off-market/listing-form";
import { createListing } from "../actions";

export const metadata: Metadata = { title: "Post an off-market listing" };
export const dynamic = "force-dynamic";

export default async function NewOffMarketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { userId, profile } = await requireUserProfile();

  if (profile.role !== "realtor" || !isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Post an off-market listing
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/off-market"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to the board
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Post an off-market listing
        </h1>
        <p className="mt-1 text-slate-500">
          Other verified agents will see this listing and your contact info so
          they can reach out to co-broke.
        </p>
      </div>

      {error ? <Notice tone="error">{decodeURIComponent(error)}</Notice> : null}

      <Card>
        <CardBody>
          <ListingForm
            action={createListing}
            listing={null}
            profile={profile}
            userId={userId}
            submitLabel="Post listing"
          />
        </CardBody>
      </Card>
    </div>
  );
}
