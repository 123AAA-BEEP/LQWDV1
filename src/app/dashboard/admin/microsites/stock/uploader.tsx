"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, MEDIA_MAX } from "@/lib/upload";
import { recordStockImage } from "./actions";

const fileInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200";

/** Direct-to-storage upload (bypasses the 4.5 MB server-action limit). */
export function StockUploader({ themes }: { themes: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const theme = (form.elements.namedItem("theme") as HTMLSelectElement).value;
    const alt = (form.elements.namedItem("alt_text") as HTMLInputElement).value;
    const city = (form.elements.namedItem("city") as HTMLInputElement).value;

    const files = Array.from(input.files ?? []);
    if (!files.length) {
      setError("Pick at least one image.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    for (const f of files) {
      const v = validateUpload(f, { types: IMAGE_MIME, max: MEDIA_MAX });
      if (v.error || !v.file) {
        setError(v.error ?? "Invalid file.");
        continue;
      }
      const path = `${theme}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extFor(v.file.type)}`;
      const { error: upErr } = await supabase.storage
        .from("stock-images")
        .upload(path, v.file, { contentType: v.file.type });
      if (upErr) {
        setError("Upload failed. Please try again.");
        continue;
      }
      const fd = new FormData();
      fd.set("path", path);
      fd.set("theme", theme);
      fd.set("alt_text", alt);
      fd.set("city", city);
      await recordStockImage(fd);
    }
    setBusy(false);
    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Theme" htmlFor="st_theme">
          <Select id="st_theme" name="theme">
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Alt text (honest description)" htmlFor="st_alt">
          <Input id="st_alt" name="alt_text" placeholder="e.g. GO train platform" maxLength={200} />
        </Field>
        <Field
          label="City (optional)"
          htmlFor="st_city"
          hint="City-tagged images beat generic ones for matching projects."
        >
          <Input id="st_city" name="city" placeholder="e.g. Waterdown" maxLength={80} />
        </Field>
      </div>
      <input
        type="file"
        name="file"
        accept={IMAGE_MIME.join(",")}
        multiple
        className={fileInputClass}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Uploading…" : "Upload to library"}
      </Button>
    </form>
  );
}
