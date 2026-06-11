/**
 * Upload validation + storage-path helpers.
 * Limits mirror the Supabase bucket settings in supabase/migrations/0003_storage.sql.
 */

export const AVATAR_MAX = 5 * 1024 * 1024; // 5 MB (avatars, logos)
export const MEDIA_MAX = 15 * 1024 * 1024; // 15 MB (project-media)
export const DOC_MAX = 25 * 1024 * 1024; // 25 MB (project-documents)

export const IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_MIME = [...IMAGE_MIME, "image/svg+xml"];
export const DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ...IMAGE_MIME,
];

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export function extFor(mime: string): string {
  return EXT[mime] ?? "bin";
}

/** Validates a FormData file entry against a type allowlist and size cap. */
export function validateUpload(
  value: FormDataEntryValue | null,
  opts: { types: string[]; max: number },
): { file: File | null; error: string | null } {
  if (!(value instanceof File) || value.size === 0) {
    return { file: null, error: "Please choose a file." };
  }
  if (!opts.types.includes(value.type)) {
    return {
      file: null,
      error: `Unsupported file type${value.type ? ` (${value.type})` : ""}.`,
    };
  }
  if (value.size > opts.max) {
    return {
      file: null,
      error: `File is too large. Maximum ${Math.round(opts.max / 1024 / 1024)} MB.`,
    };
  }
  return { file: value, error: null };
}

/** Extracts the object path from a Supabase public URL for a given bucket. */
export function pathFromPublicUrl(
  url: string,
  bucket: string,
): string | null {
  const marker = `/object/public/${bucket}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
}

/** Filesystem-safe version of a user-supplied filename. */
export function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
}
