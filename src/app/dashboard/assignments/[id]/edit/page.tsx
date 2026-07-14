import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { AssignmentForm } from "@/components/dashboard/assignments/assignment-form";
import type { AssignmentListing } from "@/lib/types";
import { updateAssignment, deleteAssignment } from "../../actions";

export const metadata: Metadata = { title: "Edit assignment" };
export const dynamic = "force-dynamic";

export default async function EditAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { userId, profile } = await requireUserProfile();
  if (!isAdmin(profile) && (profile.role !== "realtor" || !isApproved(profile))) {
    redirect("/dashboard");
  }
  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("assignment_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const listing = (data as AssignmentListing) ?? null;
  if (!listing) notFound();
  // Only the owner (or admin) edits; RLS also blocks a non-owner update.
  if (listing.realtor_id !== userId && !isAdmin(profile)) {
    redirect("/dashboard/assignments");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/assignments"
            className="text-sm text-brand-700 hover:underline"
          >
            ← Back to Assignment Desk
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Edit assignment
          </h1>
        </div>
        <form action={deleteAssignment}>
          <input type="hidden" name="id" value={listing.id} />
          <Button type="submit" variant="secondary" size="sm">
            Remove
          </Button>
        </form>
      </div>

      <AssignmentForm
        action={updateAssignment}
        listing={listing}
        error={error}
        defaults={{
          realtor_name: listing.realtor_name,
          brokerage_name: listing.brokerage_name,
          contact_phone: listing.contact_phone,
          contact_email: listing.contact_email,
        }}
      />
    </div>
  );
}
