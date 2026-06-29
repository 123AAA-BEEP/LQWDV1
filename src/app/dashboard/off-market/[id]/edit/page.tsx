import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { ListingForm } from "@/components/dashboard/off-market/listing-form";
import type { OffMarketListing } from "@/lib/types";
import { updateListing, deleteListing } from "../../actions";

export const metadata: Metadata = { title: "Edit off-market listing" };
export const dynamic = "force-dynamic";

export default async function EditOffMarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { userId, profile } = await requireUserProfile();

  if (profile.role !== "realtor" || !isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Edit listing
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("off_market_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const listing = data as OffMarketListing | null;

  // Only the owner can edit (RLS also blocks the write either way).
  if (!listing || listing.realtor_id !== userId) notFound();

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
          Edit listing
        </h1>
      </div>

      {error ? <Notice tone="error">{decodeURIComponent(error)}</Notice> : null}

      <Card>
        <CardBody>
          <ListingForm
            action={updateListing}
            listing={listing}
            profile={profile}
            userId={userId}
            submitLabel="Save changes"
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-800">Remove listing</p>
            <p className="text-xs text-slate-500">
              Takes it off the board for everyone. This can&apos;t be undone.
            </p>
          </div>
          <form action={deleteListing}>
            <input type="hidden" name="id" value={listing.id} />
            <Button type="submit" variant="danger" size="sm">
              Delete listing
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
