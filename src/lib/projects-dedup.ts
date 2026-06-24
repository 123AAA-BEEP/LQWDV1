import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Normalize a name/city for duplicate matching: lowercase, trim, collapse spaces. */
export function normalizeKey(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Finds an existing non-archived project matching the given name + city
 * (normalized), so a new manual submission merges into it instead of creating a
 * duplicate. Prefers published > approved > draft. Returns null if none.
 *
 * Used as the dedup choke-point when admins approve broker/developer
 * submissions into canonical projects.
 */
export async function findExistingProject(
  supabase: Supa,
  name: string | null | undefined,
  city: string | null | undefined,
): Promise<{
  id: string;
  project_name: string;
  record_status: string;
} | null> {
  const nk = normalizeKey(name);
  if (!nk) return null;
  const ck = normalizeKey(city);

  // Pre-filter by city when we have one (clean, low-cardinality), else by an
  // exact case-insensitive name match; then normalize-compare in JS so spacing
  // differences still collapse.
  let query = supabase
    .from("projects")
    .select("id, project_name, city, record_status")
    .neq("record_status", "archived")
    .limit(200);
  query = ck
    ? query.ilike("city", (city ?? "").trim())
    : query.ilike("project_name", (name ?? "").trim());
  const { data } = await query;

  const matches = (data ?? []).filter(
    (p) => normalizeKey(p.project_name) === nk && normalizeKey(p.city) === ck,
  );
  if (matches.length === 0) return null;

  const rank = (s: string) =>
    s === "published" ? 0 : s === "approved" ? 1 : s === "draft" ? 2 : 3;
  matches.sort((a, b) => rank(a.record_status) - rank(b.record_status));
  const m = matches[0];
  return {
    id: m.id as string,
    project_name: m.project_name as string,
    record_status: m.record_status as string,
  };
}
