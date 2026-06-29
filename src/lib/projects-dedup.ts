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

const STATUS_RANK = (s: string) =>
  s === "published" ? 0 : s === "approved" ? 1 : s === "draft" ? 2 : 3;

// Generic real-estate words that don't, on their own, identify a project — so a
// match must share at least one DISTINCTIVE (non-generic) token.
const GENERIC_TOKENS = new Set([
  "the", "at", "of", "and", "by", "on", "in", "a",
  "towns", "town", "townhomes", "townhome", "townhouse", "townhouses",
  "homes", "home", "condos", "condo", "condominiums", "condominium",
  "residences", "residence", "lofts", "loft", "urban", "tower", "towers",
  "place", "square", "phase", "collection", "suites", "suite", "villas",
  "villa", "estates", "estate", "heights", "gardens", "garden", "park",
  "living", "series", "community", "communities", "project", "development",
]);

function tokenize(s: string): string[] {
  return normalizeKey(s)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

/**
 * Like findExistingProject, but tolerant of the SHORT names used in marketing
 * emails: within the same city, an incoming name matches an existing one when
 * all of its distinctive (non-generic) tokens appear in the existing name. So a
 * forwarded "MAYA" email matches an existing "Maya Urban Towns" in Brampton and
 * UPDATES it instead of creating a duplicate. City is required (it's the guard
 * against over-matching); without one we defer to the strict matcher.
 */
export async function findExistingProjectFuzzy(
  supabase: Supa,
  name: string | null | undefined,
  city: string | null | undefined,
): Promise<{
  id: string;
  project_name: string;
  record_status: string;
  matched_by: "exact" | "fuzzy";
} | null> {
  const nk = normalizeKey(name);
  const ck = normalizeKey(city);
  if (!nk) return null;
  if (!ck) {
    const strict = await findExistingProject(supabase, name, city);
    return strict ? { ...strict, matched_by: "exact" } : null;
  }

  const { data } = await supabase
    .from("projects")
    .select("id, project_name, city, record_status")
    .neq("record_status", "archived")
    .ilike("city", (city ?? "").trim())
    .limit(200);

  const incomingDistinct = tokenize(nk).filter((t) => !GENERIC_TOKENS.has(t));
  const nameTokenCount = tokenize(nk).length;

  const scored = (data ?? [])
    .filter((p) => normalizeKey(p.city) === ck)
    .map((p) => {
      const pn = normalizeKey(p.project_name);
      const exact = pn === nk;
      const candTokens = new Set(tokenize(pn));
      const subset =
        incomingDistinct.length > 0 &&
        incomingDistinct.every((t) => candTokens.has(t));
      return {
        id: p.id as string,
        project_name: p.project_name as string,
        record_status: p.record_status as string,
        exact,
        ok: exact || subset,
        extra: Math.abs(candTokens.size - nameTokenCount),
      };
    })
    .filter((p) => p.ok);

  if (scored.length === 0) return null;

  scored.sort(
    (a, b) =>
      (a.exact === b.exact ? 0 : a.exact ? -1 : 1) ||
      STATUS_RANK(a.record_status) - STATUS_RANK(b.record_status) ||
      a.extra - b.extra,
  );
  const m = scored[0];
  return {
    id: m.id,
    project_name: m.project_name,
    record_status: m.record_status,
    matched_by: m.exact ? "exact" : "fuzzy",
  };
}
