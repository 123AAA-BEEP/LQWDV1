/** Builds a URL-safe slug, with a short random suffix to avoid collisions. */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  const suffix = Math.random().toString(16).slice(2, 8);
  return base ? `${base}-${suffix}` : `project-${suffix}`;
}
