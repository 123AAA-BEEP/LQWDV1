import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { AssignmentForm } from "@/components/dashboard/assignments/assignment-form";
import { createAssignment } from "../actions";

export const metadata: Metadata = { title: "Post an assignment" };
export const dynamic = "force-dynamic";

export default async function NewAssignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { profile } = await requireUserProfile();
  if (!isAdmin(profile) && (profile.role !== "realtor" || !isApproved(profile))) {
    redirect("/dashboard");
  }
  const { error } = await searchParams;

  const fullName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/assignments"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to Assignment Desk
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Post an assignment
        </h1>
      </div>

      <AssignmentForm
        action={createAssignment}
        error={error}
        defaults={{
          realtor_name: fullName,
          brokerage_name: profile.brokerage_name ?? "",
          contact_phone: profile.phone ?? "",
          contact_email: profile.email ?? "",
        }}
      />
    </div>
  );
}
