import "server-only";

/**
 * Address + name normalization for the discovery engine's cross-referencing.
 * Planning applications write "1196 - 1210 YONGE STREET"; a marketing signal
 * says "1196 Yonge St". Both must normalize to the same street key so the
 * address↔name match fires.
 */

const SUFFIX: Record<string, string> = {
  street: "st", st: "st",
  avenue: "ave", ave: "ave", av: "ave",
  road: "rd", rd: "rd",
  drive: "dr", dr: "dr",
  boulevard: "blvd", blvd: "blvd",
  crescent: "cres", cres: "cres",
  court: "ct", crt: "ct", ct: "ct",
  lane: "ln", ln: "ln",
  terrace: "ter", ter: "ter",
  parkway: "pkwy", pkwy: "pkwy",
  place: "pl", pl: "pl",
  circle: "cir", cir: "cir",
  highway: "hwy", hwy: "hwy",
  square: "sq", sq: "sq",
  trail: "trl", trl: "trl",
  grove: "grv", grv: "grv",
  gardens: "gdns", gdns: "gdns",
  east: "e", e: "e",
  west: "w", w: "w",
  north: "n", n: "n",
  south: "s", s: "s",
};

/** Words that add no matching signal (city names are matched separately). */
const STOP = new Set(["toronto", "ontario", "on", "canada", "unit", "suite"]);

export interface AddressKey {
  /** Normalized street token string, e.g. "yonge st" */
  street: string;
  /** Civic numbers found (a range application lists several). */
  nums: number[];
}

/**
 * Normalizes a free-text address into a street key + civic numbers.
 * Returns null when no street-ish content is present.
 */
export function addressKey(raw: string | null | undefined): AddressKey | null {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/\b[a-z]\d[a-z]\s?\d[a-z]\d\b/g, " ") // postal codes
    .replace(/[#.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;

  // Civic numbers: all standalone numbers before the first street word run.
  const nums = (cleaned.match(/\b\d{1,6}\b/g) ?? [])
    .map(Number)
    .filter((n) => n > 0 && n < 100000);

  const tokens = cleaned
    .split(" ")
    .filter((t) => t && !/^\d+$/.test(t) && t !== "-" && t !== "&" && t !== "and")
    .map((t) => SUFFIX[t] ?? t)
    .filter((t) => !STOP.has(t));

  if (tokens.length === 0) return null;
  // Keep the street phrase short — the first few tokens are the street; long
  // tails are usually neighbourhood/municipality noise.
  const street = tokens.slice(0, 4).join(" ");
  return { street, nums };
}

/** Stored form of the key for the address_norm columns. */
export function addressNorm(raw: string | null | undefined): string | null {
  const key = addressKey(raw);
  if (!key) return null;
  return `${key.nums.length ? key.nums[0] : ""} ${key.street}`.trim();
}

/**
 * Two addresses refer to the same site when the street keys agree and the
 * civic numbers overlap (range applications vs a single marketing address),
 * or one side has no number at all.
 */
export function addressesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = addressKey(a);
  const kb = addressKey(b);
  if (!ka || !kb) return false;
  // Street match: identical, or one is a prefix of the other (extra direction
  // suffixes etc.).
  const streetsAgree =
    ka.street === kb.street ||
    ka.street.startsWith(kb.street) ||
    kb.street.startsWith(ka.street);
  if (!streetsAgree) return false;
  if (ka.nums.length === 0 || kb.nums.length === 0) return true;
  const [minA, maxA] = [Math.min(...ka.nums), Math.max(...ka.nums)];
  const [minB, maxB] = [Math.min(...kb.nums), Math.max(...kb.nums)];
  // Overlapping ranges, with a small tolerance for adjacent lot assemblies.
  return minA <= maxB + 8 && minB <= maxA + 8;
}

/** Toronto boroughs collapse to "toronto" so planning + marketing data agree. */
const BOROUGHS = new Set([
  "etobicoke",
  "north york",
  "scarborough",
  "east york",
  "york",
]);

export function cityNorm(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const c = raw.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!c) return null;
  return BOROUGHS.has(c) ? "toronto" : c;
}

/** Builder-name normalization for the registry's dedup/matching key. */
export function builderNorm(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b(inc|ltd|limited|corp|corporation|llp|lp)\b\.?/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
