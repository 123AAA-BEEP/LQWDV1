import type { Metadata } from "next";
import Link from "next/link";
import { requireUserProfile, isApproved, isAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { AssignmentCard } from "@/components/dashboard/assignments/assignment-card";
import type { AssignmentListing } from "@/lib/types";

export const metadata: Metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    updated?: string;
    deleted?: string;
    q?: string;
  }>;
}) {
  const { userId, profile } = await requireUserProfile();

  // Gated: approved realtors + admins only (RLS enforces the same).
  const canView =
    isAdmin(profile) || (profile.role === "realtor" && isApproved(profile));
  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Assignments
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const admin = isAdmin(profile);
  const { created, updated, deleted, q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  const supabase = await createClient();
  let req = supabase
    .from("assignment_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (q) req = req.or(`project_name.ilike.%${q}%,city_region.ilike.%${q}%`);
  const { data } = await req;
  const listings = (data as AssignmentListing[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Assignment Desk
          </h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            A private board for verified agents to list and find pre-construction
            assignments. Browse, then reach out directly to co-broke. Visible
            only to verified LIQWD realtors — never public.
          </p>
        </div>
        <ButtonLink href="/dashboard/assignments/new">Post an assignment</ButtonLink>
      </div>

      {created ? (
        <Notice tone="success">Your assignment is live on the board.</Notice>
      ) : null}
      {updated ? <Notice tone="success">Assignment updated.</Notice> : null}
      {deleted ? <Notice tone="success">Assignment removed.</Notice> : null}

      <Notice tone="info">
        Assignments are agent-to-agent only. Builder consent, assignment
        taxation, and the assignment agreement itself are between the parties —
        LIQWD is a discovery board, not a party to any deal.
      </Notice>

      <form method="get" className="flex gap-2 sm:max-w-md">
        <Input
          name="q"
          placeholder="Search by project or city…"
          defaultValue={q}
          className="flex-1"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q ? (
          <Link href="/dashboard/assignments">
            <Button type="button" variant="secondary">
              Clear
            </Button>
          </Link>
        ) : null}
      </form>

      {listings.length === 0 ? (
        <Card>
          <CardBody className="space-y-3 py-10 text-center">
            <p className="text-sm text-slate-500">
              {q
                ? `No assignments match “${q}”.`
                : "No assignments posted yet. Be the first."}
            </p>
            <div>
              <ButtonLink href="/dashboard/assignments/new" size="sm">
                Post an assignment
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <AssignmentCard
              key={l.id}
              listing={l}
              canEdit={l.realtor_id === userId || admin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
