"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { validateUpload, extFor, IMAGE_MIME, MEDIA_MAX } from "@/lib/upload";
import { saveBuilderLogo } from "../actions";

const fileInputClass =
  "block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200";

/** Developer-logo control: upload (direct to storage), paste a URL, or clear. */
export function BuilderLogoUploader({
  micrositeId,
  projectId,
  currentUrl,
}: {
  micrositeId: string;
  projectId: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");

  async function save(fd: FormData) {
    fd.set("microsite_id", micrositeId);
    const res = await saveBuilderLogo(fd);
    if (res?.error) setError(res.error);
    else router.refresh();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const v = validateUpload(e.target.files?.[0] ?? null, {
      types: IMAGE_MIME,
      max: MEDIA_MAX,
    });
    if (v.error || !v.file) {
      setError(v.error ?? "Pick a PNG, JPG, or WebP (for SVG, paste a URL).");
      return;
    }
    setBusy(true);
    const path = `${projectId}/builder-logo-${Date.now()}.${extFor(v.file.type)}`;
    const { error: upErr } = await createClient()
      .storage.from("project-media")
      .upload(path, v.file, { contentType: v.file.type });
    if (upErr) {
      setError("Upload failed. Please try again.");
    } else {
      const fd = new FormData();
      fd.set("path", path);
      await save(fd);
    }
    setBusy(false);
    e.target.value = "";
  }

  return (
    <div className="space-y-3">
      {currentUrl ? (
        <div className="flex items-center gap-4">
          <span className="inline-flex h-20 w-40 items-center justify-center rounded-lg border border-slate-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentUrl}
              alt="Developer logo"
              className="max-h-14 w-auto max-w-full object-contain"
            />
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              const fd = new FormData();
              fd.set("clear", "1");
              void save(fd);
            }}
          >
            Remove
          </Button>
        </div>
      ) : null}
      <input
        type="file"
        accept={IMAGE_MIME.join(",")}
        onChange={handleFile}
        disabled={busy}
        className={fileInputClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-64 flex-1">
          <Input
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="…or paste a logo URL (https://…)"
            maxLength={2000}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || !pasted.trim()}
          onClick={() => {
            setError(null);
            const fd = new FormData();
            fd.set("url", pasted.trim());
            void save(fd).then(() => setPasted(""));
          }}
        >
          Save URL
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
