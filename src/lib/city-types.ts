/**
 * City × Type pSEO config — shared by /new-homes/[city]/[type], the city
 * hubs' cross-links, and the sitemap. The gate is the scalable-keyword rule:
 * a combo page exists only with real inventory behind it; thin combos stay
 * filter URLs on the browse, never index-competing pages.
 */
export const TYPE_GATE = 3;

export const TYPE_SEGMENTS: Record<
  string,
  { dbType: string; plural: string; singular: string }
> = {
  condos: { dbType: "condo", plural: "Condos", singular: "condo" },
  townhomes: { dbType: "townhouse", plural: "Townhomes", singular: "townhome" },
  "detached-homes": {
    dbType: "single_family",
    plural: "Detached Homes",
    singular: "detached home",
  },
};

/** Reverse lookup: db project_type → URL segment. */
export function segmentForDbType(dbType: string | null): string | null {
  if (!dbType) return null;
  for (const [slug, s] of Object.entries(TYPE_SEGMENTS)) {
    if (s.dbType === dbType) return slug;
  }
  return null;
}
