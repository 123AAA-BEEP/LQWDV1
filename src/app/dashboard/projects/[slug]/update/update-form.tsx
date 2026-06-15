"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, DOC_MAX } from "@/lib/upload";
import { submitUpdateRequest } from "./actions";

/**
 * Suggest-an-update form. Image attachments are uploaded straight from the
 * browser to the private `project-documents` bucket (avoiding Vercel's Server
 * Action body limit); only the resulting storage paths are submitted to the
 * server action, which records them on the update request for admin review.
 */
export function UpdateForm({
  slug,
  projectId,
  typeOptions,
}: {
  slug: string;
  projectId: string;
  typeOptions: { value: string; label: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const updateType = (
      form.elements.namedItem("update_type") as HTMLSelectElement
    ).value;
    const details = (
      form.elements.namedItem("details") as HTMLTextAreaElement
    ).value.trim();
    const fileInput = form.elements.namedItem("images") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);

    if (!updateType) {
      setError("Please choose what needs updating.");
      return;
    }
    if (!details && files.length === 0) {
      setError("Add a description or attach at least one image.");
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
    fd.set("update_type", updateType);
    fd.set("details", details);
    for (const p of paths) fd.append("attachment_paths", p);

    // The server action redirects on success (and on failure, back here with
    // ?error). Letting that propagate triggers the navigation.
    await submitUpdateRequest(fd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="What needs updating?" htmlFor="update_type">
        <Select id="update_type" name="update_type" required defaultValue="">
          <option value="" disabled>
            Choose a category…
          </option>
          {typeOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Details"
        htmlFor="details"
        hint="Describe the change. Include source links or context where helpful."
      >
        <Textarea id="details" name="details" />
      </Field>

      <Field
        label="Images (optional)"
        htmlFor="images"
        hint="Attach photos or renderings — PNG, JPG, or WebP, up to 25 MB each."
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
