import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatPriceBand } from "@/lib/types";
import {
  uploadProjectMedia,
  deleteProjectMedia,
  setHeroImage,
  addFloorplan,
  deleteFloorplan,
  uploadDocument,
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
  return (
    <>
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
                      <form action={deleteProjectMedia}>
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
            action={uploadProjectMedia}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
            <input
              type="file"
              name="file"
              accept="image/png,image/jpeg,image/webp"
              required
              className={fileInputClass}
            />
            <SubmitButton size="sm" pendingLabel="Uploading…">
              Upload image
            </SubmitButton>
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
                  <form action={deleteFloorplan}>
                    <input
                      type="hidden"
                      name="project_id"
                      value={projectId}
                    />
                    <input type="hidden" name="floorplan_id" value={fp.id} />
                    <button
                      type="submit"
                      className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No floorplans yet.</p>
          )}

          <form
            action={addFloorplan}
            className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
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
                Floorplan image (optional)
              </label>
              <input
                type="file"
                name="file"
                accept="image/png,image/jpeg,image/webp"
                className={fileInputClass}
              />
            </div>
            <SubmitButton size="sm" pendingLabel="Saving…">
              Add floorplan
            </SubmitButton>
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
                    <form action={deleteDocument}>
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
            action={uploadDocument}
            className="mt-4 space-y-3 border-t border-slate-100 pt-4"
          >
            <input type="hidden" name="project_id" value={projectId} />
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
            <SubmitButton size="sm" pendingLabel="Uploading…">
              Upload document
            </SubmitButton>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
