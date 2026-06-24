import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { UPDATE_TYPE_OPTIONS, updateTypeLabel } from "@/lib/status";
import { UpdateForm } from "./update-form";

export const metadata: Metadata = { title: "Suggest an update" };
export const dynamic = "force-dynamic";

export default async function SuggestUpdatePage({
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
          Suggest an update
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
          Suggest an update
        </h1>
        <p className="mt-1 text-slate-500">
          Flag something that’s changed on{" "}
          <span className="font-medium text-slate-700">
            {project.project_name}
          </span>
          . An admin reviews every change before it goes live.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody>
          <UpdateForm
            slug={project.slug}
            projectId={project.id}
            typeOptions={UPDATE_TYPE_OPTIONS.map((t) => ({
              value: t,
              label: updateTypeLabel(t),
            }))}
          />
        </CardBody>
      </Card>
    </div>
  );
}
