import "server-only";

/**
 * Image sourcing helpers. These make OUTBOUND fetches (Google Programmable
 * Search + downloading candidate images), so they only work where the runtime
 * has internet egress — i.e. the deployed Vercel app, NOT the dev sandbox.
 *
 * Required env (set in Vercel):
 *   GOOGLE_CSE_KEY  — Google API key with Custom Search JSON API enabled
 *   GOOGLE_CSE_CX   — Programmable Search Engine ID (cx), Image search on
 */

const CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";

// project-media bucket accepts only these (see migration 0003).
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // mirror the bucket's 15 MB cap

export interface ImageCandidate {
  imageUrl: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  width: number | null;
  height: number | null;
}

export function imageSearchConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX);
}

/** Runs a Google Custom Search image query. Returns [] on any failure. */
export async function googleImageSearch(
  query: string,
  num = 6,
): Promise<ImageCandidate[]> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return [];

  const url =
    `${CSE_ENDPOINT}?key=${key}&cx=${cx}&searchType=image&safe=active` +
    `&num=${Math.min(Math.max(num, 1), 10)}&q=${encodeURIComponent(query)}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json()) as {
    items?: Array<{
      link?: string;
      title?: string;
      image?: { contextLink?: string; width?: number; height?: number };
    }>;
  };

  return (data.items ?? [])
    .map((it) => ({
      imageUrl: String(it.link ?? ""),
      sourceUrl: it.image?.contextLink ?? null,
      sourceTitle: it.title ?? null,
      width: it.image?.width ?? null,
      height: it.image?.height ?? null,
    }))
    .filter((c) => /^https?:\/\//i.test(c.imageUrl));
}

/** Builds a focused search query from project fields. */
export function imageQueryForProject(p: {
  project_name: string;
  city: string | null;
  builder_name: string | null;
}): string {
  return [p.project_name, p.builder_name, p.city, "preconstruction Ontario"]
    .filter(Boolean)
    .join(" ");
}

// Aggregators / portals / social / stock — images here are third-party and
// noisier, so they get pushed below builder-hosted results.
const DOWNRANK_DOMAINS = [
  "livabl.com",
  "condos.ca",
  "realtor.ca",
  "zolo.ca",
  "zillow.",
  "redfin.",
  "point2homes.com",
  "buzzbuzzhome.com",
  "newinhomes.com",
  "blogto.com",
  "storeys.com",
  "pinterest.",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "linkedin.com",
  "reddit.com",
  "wikipedia.org",
  "yelp.",
  "google.",
  "gstatic.com",
  "googleusercontent.com",
];

// Generic words to ignore when matching a builder/project name to a domain.
const NAME_STOPWORDS = new Set([
  "the", "homes", "home", "group", "inc", "ltd", "corp", "corporation",
  "developments", "development", "builders", "builder", "condos", "condo",
  "residences", "residence", "towns", "townhomes", "townhome", "living",
  "by", "at", "and", "of", "preconstruction", "ontario", "communities",
  "community", "properties", "property", "realty", "real", "estate",
]);

function hostnameOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function nameTokens(s: string | null): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

/**
 * Re-orders image candidates to prefer the builder's own domain. A candidate
 * scores higher when its source page's hostname contains tokens from the
 * builder or project name, and lower when it's a known aggregator/social/stock
 * site. Original search order is the tiebreaker. No extra network calls.
 */
export function rankCandidates(
  candidates: ImageCandidate[],
  project: { project_name: string; builder_name: string | null },
): ImageCandidate[] {
  const tokens = [
    ...new Set([
      ...nameTokens(project.builder_name),
      ...nameTokens(project.project_name),
    ]),
  ];

  return candidates
    .map((c, i) => {
      const host = hostnameOf(c.sourceUrl) || hostnameOf(c.imageUrl);
      let score = 0;
      if (DOWNRANK_DOMAINS.some((d) => host.includes(d))) score -= 10;
      for (const t of tokens) {
        if (host.includes(t)) {
          score += 4; // builder/project-named domain → very likely official
          break;
        }
      }
      if ((c.width ?? 0) >= 800) score += 1; // mild preference for larger images
      return { c, i, score };
    })
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((s) => s.c);
}


export type FetchedImage =
  | { ok: true; bytes: Uint8Array; contentType: string; ext: string }
  | { ok: false; error: string };

/** Downloads + validates a candidate image (type + size). Vercel runtime only. */
export async function fetchImage(imageUrl: string): Promise<FetchedImage> {
  let res: Response;
  try {
    res = await fetch(imageUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LIQWD-image-bot)" },
    });
  } catch {
    return { ok: false, error: "Could not reach the image URL." };
  }
  if (!res.ok) return { ok: false, error: `Image fetch failed (${res.status}).` };

  const contentType = (res.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return {
      ok: false,
      error: `Unsupported image type${contentType ? ` (${contentType})` : ""}.`,
    };
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength === 0) return { ok: false, error: "Empty image." };
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image exceeds the 15 MB limit." };
  }

  return { ok: true, bytes, contentType, ext: EXT_BY_TYPE[contentType] };
}
