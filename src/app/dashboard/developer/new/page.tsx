import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { OpportunityFields } from "../opportunity-form";
import { createOpportunity } from "../actions";

export const metadata: Metadata = { title: "New opportunity" };
export const dynamic = "force-dynamic";

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/developer"
          className="text-sm text-brand-700 hover:underline"
        >
          ← Developer console
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          New opportunity
        </h1>
        <p className="mt-1 text-slate-500">
          Saved as a draft first. You can add units and publish it on the next
          screen.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody>
          <form action={createOpportunity} className="space-y-6">
            <OpportunityFields />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="submit">Create draft</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
