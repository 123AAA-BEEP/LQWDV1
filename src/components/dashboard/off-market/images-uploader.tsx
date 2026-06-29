"use client";

import { useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, MEDIA_MAX } from "@/lib/upload";
import { Notice } from "@/components/ui/notice";

const BUCKET = "off-market-media";

/**
 * Multi-image uploader for an off-market listing. Sends each file straight to
 * Supabase Storage from the browser (avoiding Vercel's Server Action body limit)
 * and stashes the resulting public URLs as hidden inputs (name="image_urls") so
 * they submit with the surrounding listing form. Storage RLS restricts writes to
 * the realtor's own uid folder. Mirrors the profile UploadTile pattern.
 */
export function ListingImagesUploader({
  userId,
  initialUrls = [],
}: {
  userId: string;
  initialUrls?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (!files.length) return;

    setError(null);
    setBusy(true);
    const supabase = createClient();
    const added: string[] = [];

    for (const file of files) {
      const v = validateUpload(file, { types: IMAGE_MIME, max: MEDIA_MAX });
      if (v.error || !v.file) {
        setError(v.error);
        continue;
      }
      const path = `${userId}/${crypto.randomUUID()}.${extFor(v.file.type)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, v.file, { contentType: v.file.type, upsert: false });
      if (upErr) {
        setError("Upload failed. Please try again.");
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);
      added.push(publicUrl);
    }

    if (added.length) setUrls((u) => [...u, ...added]);
    setBusy(false);
  }

  function remove(url: string) {
    // Drop from the form only; the orphaned storage object is harmless and can
    // be swept later. (Deleting here would need an extra round-trip per remove.)
    setUrls((u) => u.filter((x) => x !== url));
  }

  return (
    <div className="space-y-3">
      {urls.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-900/70 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
              <input type="hidden" name="image_urls" value={url} />
            </div>
          ))}
        </div>
      ) : null}

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={onFiles}
        disabled={busy}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
      />
      {busy ? (
        <p className="text-xs text-slate-500">Uploading…</p>
      ) : (
        <p className="text-xs text-slate-400">
          PNG, JPG, or WebP up to 15&nbsp;MB each. Add as many as you like.
        </p>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
