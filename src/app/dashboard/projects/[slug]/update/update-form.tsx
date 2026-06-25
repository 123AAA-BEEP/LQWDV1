"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, DOC_MAX } from "@/lib/upload";
import {
  UPDATE_FIELDS,
  UPDATE_FIELD_GROUPS,
  IMAGE_KIND_OPTIONS,
  type ProposedChange,
} from "@/lib/update-fields";
import { submitUpdateRequest } from "./actions";

/**
 * Structured "Suggest an update": every broker-safe field is pre-filled with
 * its current value; the realtor edits any subset and we submit only the diff
 * (current → proposed). The admin reviews that diff and applies it in one
 * click. Image attachments + a free-text note round it out.
 */
export function UpdateForm({
  slug,
  projectId,
  current,
}: {
  slug: string;
  projectId: string;
  current: Record<string, string>;
}) {
  const [values, setValues] = useState<Record<string, string>>({ ...current });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: string, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  function diff(): ProposedChange[] {
    return UPDATE_FIELDS.filter(
      (f) => (values[f.key] ?? "").trim() !== (current[f.key] ?? "").trim(),
    ).map((f) => ({
      key: f.key,
      label: f.label,
      group: f.group,
      source: f.source,
      column: f.column,
      type: f.type,
      from: current[f.key] ?? "",
      to: (values[f.key] ?? "").trim(),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const note = (
      form.elements.namedItem("note") as HTMLTextAreaElement
    ).value.trim();
    const imageKind = (
      form.elements.namedItem("image_kind") as HTMLSelectElement
    ).value;
    const fileInput = form.elements.namedItem("images") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);
    const changes = diff();

    if (changes.length === 0 && files.length === 0 && !note) {
      setError("Change at least one field, attach an image, or add a note.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const paths: string[] = [];

    for (const file of files) {
      const v = validateUpload(file, { types: IMAGE_MIME, max: DOC_MAX });
      if (v.error || !v.file) {
        setError(v.error);
        setBusy(false);
        return;
      }
      const path = `${projectId}/update-requests/${crypto.randomUUID()}.${extFor(
        v.file.type,
      )}`;
      const { error: upErr } = await supabase.storage
        .from("project-documents")
        .upload(path, v.file, { contentType: v.file.type, upsert: false });
      if (upErr) {
        setError("Image upload failed. Please try again.");
        setBusy(false);
        return;
      }
      paths.push(path);
    }

    const fd = new FormData();
    fd.set("slug", slug);
    fd.set("project_id", projectId);
    fd.set("changes", JSON.stringify(changes));
    fd.set("note", note);
    fd.set("image_kind", paths.length > 0 ? imageKind : "");
    for (const p of paths) fd.append("attachment_paths", p);

    // The server action redirects on success (and on failure, back here with
    // ?error). Letting that propagate triggers the navigation.
    await submitUpdateRequest(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {UPDATE_FIELD_GROUPS.map((group) => {
        const fields = UPDATE_FIELDS.filter((f) => f.group === group);
        return (
          <fieldset key={group} className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {group}
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => {
                const changed =
                  (values[f.key] ?? "").trim() !== (current[f.key] ?? "").trim();
                const label = (
                  <span className="flex items-center gap-2">
                    {f.label}
                    {changed ? (
                      <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-700">
                        edited
                      </span>
                    ) : null}
                  </span>
                );
                return (
                  <Field key={f.key} label={label} htmlFor={f.key} hint={f.hint}>
                    {f.type === "enum" ? (
                      <Select
                        id={f.key}
                        value={values[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                      >
                        <option value="">—</option>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : f.type === "boolean" ? (
                      <Select
                        id={f.key}
                        value={values[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                      >
                        <option value="">—</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Select>
                    ) : (
                      <Input
                        id={f.key}
                        type={
                          f.type === "currency" || f.type === "number"
                            ? "number"
                            : f.type === "url"
                              ? "url"
                              : "text"
                        }
                        inputMode={
                          f.type === "currency" || f.type === "number"
                            ? "decimal"
                            : undefined
                        }
                        step={f.type === "currency" ? "1" : "any"}
                        value={values[f.key] ?? ""}
                        onChange={(e) => set(f.key, e.target.value)}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Images & notes
        </legend>
        <Field
          label="Images (optional)"
          htmlFor="images"
          hint="Attach renderings, floor plans, or photos — PNG, JPG, or WebP, up to 25 MB each."
        >
          <input
            type="file"
            id="images"
            name="images"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </Field>
        <Field label="What are the images?" htmlFor="image_kind">
          <Select id="image_kind" name="image_kind" defaultValue="rendering">
            {IMAGE_KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Anything else? (optional)"
          htmlFor="note"
          hint="Context, a source link, or a change not covered by the fields above."
        >
          <Textarea id="note" name="note" />
        </Field>
      </fieldset>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit for review"}
        </Button>
        <a
          href={`/dashboard/projects/${slug}`}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
