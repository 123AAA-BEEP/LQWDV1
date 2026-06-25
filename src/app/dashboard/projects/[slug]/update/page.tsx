import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { VerificationRequired } from "@/components/dashboard/locked";
import { UPDATE_FIELDS } from "@/lib/update-fields";
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
    .select(
      "id, slug, project_name, price_from_public, price_to_public, sales_status, total_units, storeys, project_type, neighbourhood",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!project) notFound();

  // Pull broker-only commission + the primary broker portal so every field can
  // be pre-filled with its current value (the suggestion becomes a true diff).
  const [{ data: commercials }, { data: portal }] = await Promise.all([
    supabase
      .from("project_private_commercials")
      .select("commission_percent, commission_summary, commission_is_negotiable")
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("project_broker_portals")
      .select("url")
      .eq("project_id", project.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sources: Record<string, Record<string, unknown> | null> = {
    project: project as Record<string, unknown>,
    commercials: (commercials as Record<string, unknown> | null) ?? null,
    portal: portal ? { broker_portal_url: portal.url } : null,
  };

  const current: Record<string, string> = {};
  for (const f of UPDATE_FIELDS) {
    const row = sources[f.source];
    const col = f.source === "portal" ? "broker_portal_url" : f.column;
    const v = row && col ? row[col] : null;
    current[f.key] =
      v === null || v === undefined
        ? ""
        : f.type === "boolean"
          ? v
            ? "true"
            : "false"
          : String(v);
  }

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
          Edit any field on{" "}
          <span className="font-medium text-slate-700">
            {project.project_name}
          </span>{" "}
          and submit the changes. An admin reviews every change before it goes
          live.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Card>
        <CardBody>
          <UpdateForm
            slug={project.slug}
            projectId={project.id}
            current={current}
          />
        </CardBody>
      </Card>
    </div>
  );
}
