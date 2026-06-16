import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Textarea, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { RECORD_STATUS, RECORD_STATUS_OPTIONS } from "@/lib/status";
import type { RecordStatus } from "@/lib/status";
import {
  updateProject,
  savePublicPage,
  publishProject,
  unpublishProject,
} from "./actions";
import { ProjectUploads } from "./uploads";

export const metadata: Metadata = { title: "Edit project" };
export const dynamic = "force-dynamic";

const UPLOAD_MESSAGES: Record<string, string> = {
  "media-added": "Image uploaded.",
  "floorplan-added": "Floorplan added.",
  "document-added": "Document uploaded.",
};

export default async function AdminProjectEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { id } = await params;
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: page } = await supabase
    .from("public_project_pages")
    .select("*")
    .eq("project_id", id)
    .maybeSingle();

  // Upload-managed assets.
  const [{ data: media }, { data: floorplans }, { data: documents }] =
    await Promise.all([
      supabase
        .from("project_media")
        .select("id, url, alt_text")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_floorplans")
        .select("id, plan_name, unit_type, sqft_interior, price_public, floorplan_image_url")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_documents")
        .select("id, title, document_type, file_url, created_at")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
    ]);

  // Short-lived signed URLs for the PRIVATE documents bucket.
  const docPaths = (documents ?? []).map((d) => d.file_url as string);
  const signed = docPaths.length
    ? (
        await supabase.storage
          .from("project-documents")
          .createSignedUrls(docPaths, 3600)
      ).data ?? []
    : [];
  const signedByPath = new Map(
    signed.map((s) => [s.path ?? "", s.signedUrl]),
  );

  const recordStatus = project.record_status as RecordStatus;
  const isLive =
    project.public_page_enabled &&
    project.record_status === "published" &&
    (page?.is_active ?? false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard/admin/projects"
            className="text-sm text-brand-700 hover:underline"
          >
            ← All projects
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {project.project_name}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge tone="success">Live</Badge>
          ) : (
            <Badge tone="neutral">Not public</Badge>
          )}
          <Badge tone={RECORD_STATUS[recordStatus].tone}>
            {RECORD_STATUS[recordStatus].label}
          </Badge>
        </div>
      </div>

      {message && UPLOAD_MESSAGES[message] ? (
        <Notice tone="success">{UPLOAD_MESSAGES[message]}</Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Publish controls */}
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-ink">Public page</h3>
            <p className="text-sm text-slate-500">
              {isLive
                ? "This project is visible on its public page."
                : "Publishing makes the public, SEO-safe page live."}
            </p>
            {isLive && page ? (
              <Link
                href={`/projects/${page.slug}`}
                className="text-xs text-brand-700 hover:underline"
                target="_blank"
              >
                View public page →
              </Link>
            ) : null}
          </div>
          {isLive ? (
            <form action={unpublishProject}>
              <input type="hidden" name="project_id" value={id} />
              <Button type="submit" variant="secondary">
                Unpublish
              </Button>
            </form>
          ) : (
            <form action={publishProject}>
              <input type="hidden" name="project_id" value={id} />
              <Button type="submit">Publish</Button>
            </form>
          )}
        </CardBody>
      </Card>

      {/* Canonical fields */}
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Canonical project</h3>
          <form action={updateProject} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor="project_name">
                <Input
                  id="project_name"
                  name="project_name"
                  defaultValue={project.project_name ?? ""}
                  required
                />
              </Field>
              <Field label="Builder / developer" htmlFor="builder_name">
                <Input
                  id="builder_name"
                  name="builder_name"
                  defaultValue={project.builder_name ?? ""}
                />
              </Field>
              <Field label="City" htmlFor="city">
                <Input
                  id="city"
                  name="city"
                  defaultValue={project.city ?? ""}
                />
              </Field>
              <Field label="Occupancy" htmlFor="occupancy_estimate_text">
                <Input
                  id="occupancy_estimate_text"
                  name="occupancy_estimate_text"
                  defaultValue={project.occupancy_estimate_text ?? ""}
                />
              </Field>
              <Field label="Sales status" htmlFor="sales_status">
                <Select
                  id="sales_status"
                  name="sales_status"
                  defaultValue={project.sales_status ?? ""}
                >
                  <option value="">—</option>
                  {[
                    "coming_soon",
                    "selling",
                    "paused",
                    "sold_out",
                    "completed",
                    "unknown",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Construction status" htmlFor="construction_status">
                <Select
                  id="construction_status"
                  name="construction_status"
                  defaultValue={project.construction_status ?? ""}
                >
                  <option value="">—</option>
                  {[
                    "preconstruction",
                    "under_construction",
                    "completed",
                    "unknown",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Price from (public)" htmlFor="price_from_public">
                <Input
                  id="price_from_public"
                  name="price_from_public"
                  type="number"
                  defaultValue={project.price_from_public ?? ""}
                />
              </Field>
              <Field label="Price to (public)" htmlFor="price_to_public">
                <Input
                  id="price_to_public"
                  name="price_to_public"
                  type="number"
                  defaultValue={project.price_to_public ?? ""}
                />
              </Field>
            </div>
            <Field label="Hero image URL" htmlFor="hero_image_url">
              <Input
                id="hero_image_url"
                name="hero_image_url"
                defaultValue={project.hero_image_url ?? ""}
              />
            </Field>
            <Field label="Short description" htmlFor="description_short">
              <Textarea
                id="description_short"
                name="description_short"
                defaultValue={project.description_short ?? ""}
              />
            </Field>
            <Field label="Long description" htmlFor="description_long">
              <Textarea
                id="description_long"
                name="description_long"
                defaultValue={project.description_long ?? ""}
              />
            </Field>
            <Field
              label="Record status"
              htmlFor="record_status"
              hint="Public visibility also requires the page to be published."
            >
              <Select
                id="record_status"
                name="record_status"
                defaultValue={recordStatus}
              >
                {RECORD_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {RECORD_STATUS[s].label}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Advertising & similar-properties controls */}
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-semibold text-ink">
                Advertising & similar properties
              </p>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_advertiser"
                  defaultChecked={project.is_advertiser ?? false}
                  className="mt-0.5 size-4"
                />
                <span>
                  Paying advertiser
                  <span className="mt-0.5 block text-xs text-slate-500">
                    When on, the &ldquo;similar properties&rdquo; block is hidden
                    on this page by default, so competitors aren&rsquo;t shown.
                  </span>
                </span>
              </label>
              <Field
                label="Similar-properties block"
                htmlFor="show_similar_override"
                hint="Auto = show on free listings, hide for paying advertisers. Use show/hide to force it."
              >
                <Select
                  id="show_similar_override"
                  name="show_similar_override"
                  defaultValue={
                    project.show_similar_override === true
                      ? "show"
                      : project.show_similar_override === false
                        ? "hide"
                        : ""
                  }
                >
                  <option value="">Auto (based on advertiser status)</option>
                  <option value="show">Always show</option>
                  <option value="hide">Always hide</option>
                </Select>
              </Field>
            </div>

            <Button type="submit">Save project</Button>
          </form>
        </CardBody>
      </Card>

      {/* Public, SEO-safe page fields */}
      <Card>
        <CardBody>
          <h3 className="font-semibold text-ink">Public page content</h3>
          <p className="mt-1 text-sm text-slate-500">
            Only public-safe fields. Never includes commission, broker portals,
            or private data.
          </p>
          <form action={savePublicPage} className="mt-4 space-y-4">
            <input type="hidden" name="project_id" value={id} />
            <Field
              label="Slug"
              htmlFor="slug"
              hint="Used in the public URL: /projects/your-slug"
            >
              <Input
                id="slug"
                name="slug"
                defaultValue={page?.slug ?? project.slug ?? ""}
                required
              />
            </Field>
            <Field label="SEO title" htmlFor="seo_title">
              <Input
                id="seo_title"
                name="seo_title"
                defaultValue={page?.seo_title ?? ""}
              />
            </Field>
            <Field label="Meta description" htmlFor="seo_meta_description">
              <Textarea
                id="seo_meta_description"
                name="seo_meta_description"
                defaultValue={page?.seo_meta_description ?? ""}
              />
            </Field>
            <Field label="Page summary" htmlFor="page_summary">
              <Textarea
                id="page_summary"
                name="page_summary"
                defaultValue={page?.page_summary ?? ""}
              />
            </Field>
            <Field
              label="Public description"
              htmlFor="page_description"
              hint="Approved, public-safe copy shown on the public page."
            >
              <Textarea
                id="page_description"
                name="page_description"
                defaultValue={page?.page_description ?? ""}
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="indexable"
                defaultChecked={page?.indexable ?? false}
                className="size-4"
              />
              Allow search engines to index this page
            </label>
            <Button type="submit" variant="secondary">
              Save public content
            </Button>
          </form>
        </CardBody>
      </Card>

      <ProjectUploads
        projectId={id}
        heroUrl={project.hero_image_url ?? null}
        media={(media ?? []) as { id: string; url: string; alt_text: string | null }[]}
        floorplans={
          (floorplans ?? []) as {
            id: string;
            plan_name: string | null;
            unit_type: string | null;
            sqft_interior: number | null;
            price_public: number | null;
            floorplan_image_url: string | null;
          }[]
        }
        documents={(documents ?? []).map((d) => ({
          id: d.id as string,
          title: d.title as string,
          document_type: d.document_type as string,
          signedUrl: signedByPath.get(d.file_url as string) ?? null,
          path: d.file_url as string,
        }))}
      />
    </div>
  );
}
