"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, DOC_MIME, DOC_MAX, safeName } from "@/lib/upload";
import { recordMaterial } from "./actions";

/**
 * Floor-plan / brochure uploader. The file goes browser-direct to the private
 * project-documents bucket, then the server action records it as a PROJECT
 * document — a community asset every LIQWD agent can reuse in their own
 * shortlists. Buyers only ever see it through short-lived signed URLs, and
 * only because the uploader confirmed their right to share it.
 */
export function MaterialUpload({
  collectionId,
  projectId,
  userId,
}: {
  collectionId: string;
  projectId: string;
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const rights = form.elements.namedItem("rights") as HTMLInputElement;
    const labelInput = form.elements.namedItem("label") as HTMLInputElement;
    const kindInput = form.elements.namedItem("kind") as HTMLSelectElement;

    if (!rights.checked) {
      setError("Please confirm you have the right to share this material.");
      return;
    }
    const v = validateUpload(input.files?.[0] ?? null, {
      types: DOC_MIME,
      max: DOC_MAX,
    });
    if (v.error || !v.file) {
      setError(v.error);
      return;
    }

    setBusy(true);
    const path = `${projectId}/broker-${userId}/${Date.now()}-${safeName(v.file.name)}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from("project-documents")
      .upload(path, v.file, { contentType: v.file.type });
    if (upErr) {
      setError("Upload failed. Please try again.");
      setBusy(false);
      return;
    }

    const fd = new FormData();
    fd.set("collection_id", collectionId);
    fd.set("project_id", projectId);
    fd.set("path", path);
    fd.set("kind", kindInput.value);
    fd.set("label", labelInput.value.trim() || v.file.name.replace(/\.[^.]+$/, ""));
    fd.set("rights", "on");
    await recordMaterial(fd);
    form.reset();
    router.refresh();
    setBusy(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <select
          name="kind"
          defaultValue="floor_plan"
          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
          aria-label="Material type"
        >
          <option value="floor_plan">Floor plans</option>
          <option value="brochure">Brochure</option>
          <option value="price_sheet">Price sheet</option>
          <option value="other">Other</option>
        </select>
        <input
          type="text"
          name="label"
          placeholder="Label (e.g. Tower B floor plans)"
          maxLength={80}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          {busy ? "Uploading…" : "Attach"}
        </Button>
      </div>
      <label className="flex items-start gap-2 text-xs text-slate-500">
        <input type="checkbox" name="rights" className="mt-0.5" required />
        <span>
          I have the right to share this material with clients (e.g. the
          builder provided it to me for distribution). It will be available to
          all LIQWD agents on this project.
        </span>
      </label>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </form>
  );
}
