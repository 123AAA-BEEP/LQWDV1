"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, AVATAR_MAX, LOGO_MIME } from "@/lib/upload";
import { recordAvatar, recordLogo } from "./upload-actions";

/**
 * Profile photo / logo uploader. Sends the file straight to Supabase Storage
 * from the browser (avoiding Vercel's Server Action body limit), then records
 * the resulting public URL on the profile.
 */
export function UploadTile({
  kind,
  title,
  currentUrl,
  userId,
  accept,
  fallback,
  rounded,
}: {
  kind: "avatar" | "logo";
  title: string;
  currentUrl: string | null;
  userId: string;
  accept: string;
  fallback: string;
  rounded?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bucket = kind === "avatar" ? "avatars" : "logos";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement;
    const v = validateUpload(input.files?.[0] ?? null, {
      types: LOGO_MIME, // superset (includes svg); avatars further limited by accept
      max: AVATAR_MAX,
    });
    if (v.error || !v.file) {
      setError(v.error);
      return;
    }

    setBusy(true);
    const path = `${userId}/${kind}.${extFor(v.file.type)}`;
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, v.file, { contentType: v.file.type, upsert: true });
    if (upErr) {
      setError("Upload failed. Please try again.");
      setBusy(false);
      return;
    }

    const fd = new FormData();
    fd.set("path", path);
    await (kind === "avatar" ? recordAvatar(fd) : recordLogo(fd));
    form.reset();
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        <div
          className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${
            rounded ? "rounded-full" : "rounded-lg"
          }`}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2 text-center text-[10px] text-slate-400">
              {fallback}
            </span>
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex-1 space-y-2">
          <p className="text-sm font-medium text-slate-700">{title}</p>
          <input
            type="file"
            name="file"
            accept={accept}
            required
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={busy}>
            {busy ? "Uploading…" : currentUrl ? "Replace" : "Upload"}
          </Button>
        </form>
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
