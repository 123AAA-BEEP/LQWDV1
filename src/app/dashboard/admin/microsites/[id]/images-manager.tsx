"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, MEDIA_MAX } from "@/lib/upload";
import {
  recordMicrositeImage,
  deleteMicrositeImage,
  setMicrositeHeroImage,
} from "../actions";

const fileInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200";

interface MediaRow {
  id: string;
  url: string;
  alt_text: string | null;
}

/**
 * The microsite's photography, editable in place: multi-upload straight to
 * storage, make any image the hero (the page backdrop), remove what's weak.
 * Same media library the project editor manages — one source of truth.
 */
export function MicrositeImagesManager({
  micrositeId,
  projectId,
  heroUrl,
  media,
}: {
  micrositeId: string;
  projectId: string;
  heroUrl: string | null;
  media: MediaRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    const supabase = createClient();
    for (const f of files) {
      const v = validateUpload(f, { types: IMAGE_MIME, max: MEDIA_MAX });
      if (v.error || !v.file) {
        setError(v.error ?? "Invalid file.");
        continue;
      }
      const path = `${projectId}/media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extFor(v.file.type)}`;
      const { error: upErr } = await supabase.storage
        .from("project-media")
        .upload(path, v.file, { contentType: v.file.type });
      if (upErr) {
        setError("Upload failed. Please try again.");
        continue;
      }
      const fd = new FormData();
      fd.set("microsite_id", micrositeId);
      fd.set("project_id", projectId);
      fd.set("path", path);
      await recordMicrositeImage(fd);
    }
    setBusy(false);
    e.target.value = "";
    router.refresh();
  }

  async function act(
    action: (fd: FormData) => Promise<void>,
    fields: Record<string, string>,
  ) {
    setBusy(true);
    const fd = new FormData();
    fd.set("microsite_id", micrositeId);
    fd.set("project_id", projectId);
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    await action(fd);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept={IMAGE_MIME.join(",")}
        multiple
        onChange={handleUpload}
        disabled={busy}
        className={fileInputClass}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {media.length === 0 ? (
        <p className="text-sm text-slate-500">
          No photos yet. Upload renderings above; the first thing to set is
          the hero.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.map((m) => {
            const isHero = m.url === heroUrl;
            return (
              <div
                key={m.id}
                className={`space-y-2 rounded-xl border p-2 ${isHero ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt_text ?? "Project photo"}
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
                <div className="flex items-center justify-between gap-1">
                  {isHero ? (
                    <Badge tone="success">Hero</Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        act(setMicrositeHeroImage, { url: m.url })
                      }
                    >
                      Make hero
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => act(deleteMicrositeImage, { media_id: m.id })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
