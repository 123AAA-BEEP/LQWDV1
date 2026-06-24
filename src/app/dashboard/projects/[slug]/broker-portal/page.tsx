import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { VerificationRequired } from "@/components/dashboard/locked";
import { suggestBrokerPortal } from "./actions";

export const metadata: Metadata = { title: "Suggest a broker portal" };
export const dynamic = "force-dynamic";

export default async function SuggestBrokerPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { slug } = await params;
  const { error } = await searchParams;
  const { profile } = await requireUserProfile();

  if (!isApproved(profile)) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Suggest a broker portal
        </h1>
        <VerificationRequired />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("broker_projects_view")
    .select("id, slug, project_name")
    .eq("slug", slug)
    .maybeSingle();

  if (!project) notFound();

  const presetName = `${project.project_name} Broker Portal`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${slug}`}
          className="text-sm text-brand-700 hover:underline"
        >
          ← Back to {project.project_name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          Suggest a broker portal
        </h1>
        <p className="mt-1 text-slate-500">
          Add the broker portal link for{" "}
          <span className="font-medium text-slate-700">
            {project.project_name}
          </span>
          . An admin reviews every suggestion before it goes live — it won&apos;t
          appear in the directory until then.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody>
          <form action={suggestBrokerPortal} className="space-y-4">
            <input type="hidden" name="slug" value={project.slug} />
            <input type="hidden" name="project_id" value={project.id} />

            <Field
              label="Portal name"
              htmlFor="portal_name_preview"
              hint="Set automatically from the project name — you can't change this."
            >
              <Input
                id="portal_name_preview"
                value={presetName}
                readOnly
                disabled
                className="cursor-not-allowed bg-slate-50 text-slate-500"
              />
            </Field>

            <Field
              label="Broker portal link"
              htmlFor="url"
              hint="Paste the full URL realtors use to access the portal."
            >
              <Input
                id="url"
                name="url"
                type="url"
                inputMode="url"
                placeholder="https://…"
                required
              />
            </Field>

            <Field
              label="Access notes (optional)"
              htmlFor="access_notes"
              hint="Anything an admin should know — e.g. login required, password, contact."
            >
              <Textarea id="access_notes" name="access_notes" />
            </Field>

            <div className="flex items-center gap-3">
              <SubmitButton pendingLabel="Submitting…">
                Submit for review
              </SubmitButton>
              <Link
                href={`/dashboard/projects/${slug}`}
                className="text-sm text-slate-500 hover:text-slate-800"
              >
                Cancel
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
