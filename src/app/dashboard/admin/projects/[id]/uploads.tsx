"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { formatPriceBand } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import {
  validateUpload,
  extFor,
  safeName,
  IMAGE_MIME,
  FLOORPLAN_MIME,
  DOC_MIME,
  MEDIA_MAX,
  DOC_MAX,
} from "@/lib/upload";
import {
  recordProjectMedia,
  deleteProjectMedia,
  setHeroImage,
  recordFloorplan,
  deleteFloorplan,
  recordDocument,
  deleteDocument,
} from "./media-actions";

interface MediaRow {
  id: string;
  url: string;
  alt_text: string | null;
}
interface FloorplanRow {
  id: string;
  plan_name: string | null;
  unit_type: string | null;
  sqft_interior: number | null;
  price_public: number | null;
  floorplan_image_url: string | null;
}
interface DocRow {
  id: string;
  title: string;
  document_type: string;
  signedUrl: string | null;
  path: string;
}

const fileInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200";

export function ProjectUploads({
  projectId,
  heroUrl,
  media,
  floorplans,
  documents,
}: {
  projectId: string;
  heroUrl: string | null;
  media: MediaRow[];
  floorplans: FloorplanRow[];
  documents: DocRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "media" | "floorplan" | "document">(
    null,
  );

  /**
   * Uploads a file straight to Supabase Storage from the browser, bypassing
   * Vercel's 4.5 MB Server Action body limit. Returns the storage path or null.
   */
  async function uploadToBucket(
    bucket: string,
    path: string,
    file: File,
  ): Promise<string | null> {
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, { contentType: file.type });
    if (upErr) {
      setError("Upload failed. Please try again.");
      return null;
    }
    return path;
  }

  async function handleMedia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const v = validateUpload(input.files?.[0] ?? null, {
      types: IMAGE_MIME,
      max: MEDIA_MAX,
    });
    if (v.error || !v.file) {
      setError(v.error);
      return;
    }
    setBusy("media");
    const path = `${projectId}/media-${Date.now()}.${extFor(v.file.type)}`;
    const ok = await uploadToBucket("project-media", path, v.file);
    if (ok) {
      const fd = new FormData();
      fd.set("project_id", projectId);
      fd.set("path", path);
      await recordProjectMedia(fd);
      form.reset();
      router.refresh();
    }
    setBusy(null);
  }

  async function handleFloorplan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("project_id", projectId);

    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    setBusy("floorplan");
    if (file && file.size > 0) {
      const v = validateUpload(file, { types: FLOORPLAN_MIME, max: MEDIA_MAX });
      if (v.error || !v.file) {
        setError(v.error);
        setBusy(null);
        return;
      }
      const path = `${projectId}/floorplans/fp-${Date.now()}.${extFor(v.file.type)}`;
      const ok = await uploadToBucket("project-media", path, v.file);
      if (!ok) {
        setBusy(null);
        return;
      }
      fd.set("image_path", path);
    }
    fd.delete("file");
    await recordFloorplan(fd);
    form.reset();
    router.refresh();
    setBusy(null);
  }

  async function handleDocument(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const title = (
      form.elements.namedItem("title") as HTMLInputElement
    ).value.trim();
    if (!title) {
      setError("A document title is required.");
      return;
    }
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const v = validateUpload(input.files?.[0] ?? null, {
      types: DOC_MIME,
      max: DOC_MAX,
    });
    if (v.error || !v.file) {
      setError(v.error);
      return;
    }
    setBusy("document");
    const path = `${projectId}/${Date.now()}-${safeName(v.file.name)}`;
    const ok = await uploadToBucket("project-documents", path, v.file);
    if (ok) {
      const fd = new FormData(form);
      fd.set("project_id", projectId);
      fd.set("path", path);
      fd.delete("file");
      await recordDocument(fd);
      form.reset();
      router.refresh();
    }
    setBusy(null);
  }

  return (
    <>
      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* Media (public) */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Project images</h3>
            <Badge tone="neutral">Public</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Public gallery images. PNG, JPG, or WebP up to 15&nbsp;MB.
          </p>

          {media.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {media.map((m) => {
                const isHero = heroUrl === m.url;
                return (
                  <div
                    key={m.id}
                    className="overflow-hidden rounded-lg border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.alt_text ?? "Project image"}
                      className="h-28 w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-1 p-2">
                      {isHero ? (
                        <Badge tone="brand">Hero</Badge>
                      ) : (
                        <form action={setHeroImage}>
                          <input
                            type="hidden"
                            name="project_id"
                            value={projectId}
                          />
                          <input type="hidden" name="url" value={m.url} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            Set hero
                          </button>
                        </form>
                      )}
                      <form
                        action={deleteProjectMedia}
                        onSubmit={(e) => {
                          if (
                            !window.confirm(
                              "Delete this image? If it's on the public page it disappears immediately. This can't be undone.",
                            )
                          )
                            e.preventDefault();
                        }}
                      >
                        <input
                          type="hidden"
                          name="project_id"
                          value={projectId}
                        />
                        <input type="hidden" name="media_id" value={m.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No images yet.</p>
          )}

          <form
            onSubmit={handleMedia}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
          >
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className={fileInputClass}
            />
            <Button type="submit" size="sm" disabled={busy === "media"}>
              {busy === "media" ? "Uploading…" : "Upload image"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Floorplans (public) */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Floorplans</h3>
            <Badge tone="neutral">Public</Badge>
          </div>

          {floorplans.length > 0 ? (
            <div className="mt-4 space-y-2">
              {floorplans.map((fp) => (
                <div
                  key={fp.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {fp.plan_name ?? "Untitled plan"}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {[
                        fp.unit_type,
                        fp.sqft_interior ? `${fp.sqft_interior} sq ft` : null,
                        fp.price_public
                          ? formatPriceBand(fp.price_public, null)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {fp.floorplan_image_url ? (
                      <a
                        href={fp.floorplan_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        View
                      </a>
                    ) : null}
                    <form
                      action={deleteFloorplan}
                      onSubmit={(e) => {
                        if (
                          !window.confirm(
                            "Delete this floorplan? This can't be undone.",
                          )
                        )
                          e.preventDefault();
                      }}
                    >
                      <input
                        type="hidden"
                        name="project_id"
                        value={projectId}
                      />
                      <input type="hidden" name="floorplan_id" value={fp.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No floorplans yet.</p>
          )}

          <form
            onSubmit={handleFloorplan}
            className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan name" htmlFor="plan_name">
                <Input id="plan_name" name="plan_name" />
              </Field>
              <Field label="Unit type" htmlFor="unit_type">
                <Input id="unit_type" name="unit_type" placeholder="2 Bed + Den" />
              </Field>
              <Field label="Interior sq ft" htmlFor="sqft_interior">
                <Input id="sqft_interior" name="sqft_interior" type="number" />
              </Field>
              <Field label="Public price" htmlFor="price_public">
                <Input id="price_public" name="price_public" type="number" />
              </Field>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Floorplan file (optional)
              </label>
              <input
                type="file"
                name="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className={fileInputClass}
              />
              <p className="mt-1 text-xs text-slate-400">
                PDF is the standard — upload the builder&apos;s plan as-is.
                Images work too.
              </p>
            </div>
            <Button type="submit" size="sm" disabled={busy === "floorplan"}>
              {busy === "floorplan" ? "Saving…" : "Add floorplan"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Documents (private) */}
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink">Documents &amp; brochures</h3>
            <Badge tone="warning">Restricted</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Stored privately. Links are short-lived and never publicly
            accessible. PDF, Office docs, or images up to 25&nbsp;MB.
          </p>

          {documents.length > 0 ? (
            <div className="mt-4 space-y-2">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {d.title}
                    </p>
                    <p className="text-xs text-slate-400">{d.document_type}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {d.signedUrl ? (
                      <a
                        href={d.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Open
                      </a>
                    ) : null}
                    <form
                      action={deleteDocument}
                      onSubmit={(e) => {
                        if (
                          !window.confirm(
                            "Delete this document? This can't be undone.",
                          )
                        )
                          e.preventDefault();
                      }}
                    >
                      <input
                        type="hidden"
                        name="project_id"
                        value={projectId}
                      />
                      <input type="hidden" name="document_id" value={d.id} />
                      <input type="hidden" name="path" value={d.path} />
                      <button
                        type="submit"
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No documents yet.</p>
          )}

          <form
            onSubmit={handleDocument}
            className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title" htmlFor="title">
                <Input id="title" name="title" required />
              </Field>
              <Field label="Type" htmlFor="document_type">
                <Input
                  id="document_type"
                  name="document_type"
                  defaultValue="brochure"
                  placeholder="brochure, price sheet…"
                />
              </Field>
            </div>
            <input
              type="file"
              name="file"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp"
              required
              className={fileInputClass}
            />
            <Button type="submit" size="sm" disabled={busy === "document"}>
              {busy === "document" ? "Uploading…" : "Upload document"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
