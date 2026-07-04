"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, MEDIA_MAX } from "@/lib/upload";
import { Notice } from "@/components/ui/notice";

const BUCKET = "off-market-media";
const SIGN_TTL_SECONDS = 60 * 60;

interface Photo {
  /** Storage path — what the form stores in image_urls. */
  path: string;
  /** Short-lived signed URL (or local object URL) for the thumbnail. */
  preview: string;
}

/**
 * Multi-image uploader for an off-market listing. Sends each file straight to
 * Supabase Storage from the browser (avoiding Vercel's Server Action body
 * limit) and stashes the storage PATHS as hidden inputs (name="image_urls")
 * so they submit with the surrounding listing form. The bucket is PRIVATE
 * (migration 0060) — previews use signed URLs, which storage RLS grants to
 * approved realtors; writes stay restricted to the realtor's own uid folder.
 */
export function ListingImagesUploader({
  userId,
  initialUrls = [],
}: {
  userId: string;
  /** Stored storage paths (legacy rows may carry full URLs — normalized). */
  initialUrls?: string[];
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing photos (edit flow): sign the stored paths for thumbnails.
  useEffect(() => {
    const paths = initialUrls
      .map((u) =>
        u.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/off-market-media\//, "").split("?")[0],
      )
      .filter(Boolean);
    if (!paths.length) return;
    const supabase = createClient();
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGN_TTL_SECONDS)
      .then(({ data }) => {
        const signed: Photo[] = [];
        for (const d of data ?? []) {
          if (d.path && d.signedUrl && !d.error) {
            signed.push({ path: d.path, preview: d.signedUrl });
          }
        }
        setPhotos((cur) => {
          const have = new Set(cur.map((p) => p.path));
          return [...cur, ...signed.filter((s) => !have.has(s.path))];
        });
      });
    // initialUrls is stable for the life of the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (!files.length) return;

    setError(null);
    setBusy(true);
    const supabase = createClient();
    const added: Photo[] = [];

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
      // The just-uploaded file previews from memory — no round-trip needed.
      added.push({ path, preview: URL.createObjectURL(v.file) });
    }

    if (added.length) setPhotos((p) => [...p, ...added]);
    setBusy(false);
  }

  function remove(path: string) {
    // Drop from the form only; the orphaned storage object is harmless and can
    // be swept later. (Deleting here would need an extra round-trip per remove.)
    setPhotos((p) => p.filter((x) => x.path !== path));
  }

  return (
    <div className="space-y-3">
      {photos.length ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map(({ path, preview }) => (
            <div
              key={path}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(path)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-900/70 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
              <input type="hidden" name="image_urls" value={path} />
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
