import "server-only";
import type { InboundImage } from "./extract";

/**
 * Hot-drop support: forwarded emails are often just "look at this" + a URL
 * (e.g. a Facebook-ad landing page). This module follows up to two links from
 * the email server-side, returns their readable text for the extractor, and
 * downloads their hero images (og:image etc.) so the vision pass + hero upload
 * work even when the email itself carries nothing.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const MAX_PAGES = 2;
const MAX_PAGE_CHARS = 6000;
/** Download up to this many candidates, then keep the biggest ones —
 *  renderings are megabytes, header logos are kilobytes. */
const MAX_FETCH_IMAGES = 9;
const MAX_LINK_IMAGES = 6;
/** Below this an image is a logo/icon/thumbnail — never a hero candidate. */
const MIN_IMAGE_BYTES = 15 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
/** URL smells for brand assets rather than property imagery. */
const LOGOISH_URL_RE = /logo|icon|favicon|badge|award|footer|header-|sprite/i;

// Link noise we never want to follow from marketing emails.
const SKIP_HOSTS =
  /(^|\.)(facebook|instagram|twitter|x|linkedin|youtube|tiktok|google)\.com$|(^|\.)liqwd\.ca$|(^|\.)getliqwd\.com$/i;
const SKIP_PATH = /unsubscribe|optout|opt-out|mailto|\.pdf($|\?)|\.ics($|\?)/i;

/** Candidate page URLs from the email body (text first — the forwarded-link case). */
export function extractCandidateUrls(
  text: string | null,
  html: string | null,
): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    try {
      const u = new URL(raw.replace(/[).,>\]]+$/, ""));
      if (!/^https?:$/.test(u.protocol)) return;
      if (SKIP_HOSTS.test(u.hostname)) return;
      if (SKIP_PATH.test(u.pathname + u.search)) return;
      const key = u.origin + u.pathname;
      if (seen.has(key)) return;
      seen.add(key);
      found.push(u.toString());
    } catch {
      /* not a URL */
    }
  };
  for (const m of (text ?? "").matchAll(/https?:\/\/[^\s<>"']+/g)) push(m[0]);
  for (const m of (html ?? "").matchAll(/href=["'](https?:\/\/[^"']+)["']/gi))
    push(m[1]);
  return found.slice(0, MAX_PAGES);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Hero-image candidates from a fetched page, in preference order. Modern
 *  landing pages hide their renderings in lazy-load attrs, srcset, and CSS
 *  backgrounds — the wordmark og:image is often the ONLY plain <img>. */
function imageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    const cleaned = raw.trim();
    if (!cleaned || cleaned.startsWith("data:")) return;
    if (/\.svg($|\?)/i.test(cleaned)) return; // vector logos, never heroes
    try {
      urls.push(new URL(cleaned, baseUrl).toString());
    } catch {
      /* ignore */
    }
  };
  // Highest-signal first: social preview images.
  push(html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]);
  push(html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1]);
  push(html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1]);
  // Plain + lazy-loaded <img> sources.
  for (const m of html.matchAll(
    /<img[^>]+(?:src|data-src|data-lazy-src|data-original)=["']([^"']+)["']/gi,
  ))
    push(m[1]);
  // srcset: take the last (largest) candidate of each.
  for (const m of html.matchAll(/(?:srcset|data-srcset)=["']([^"']+)["']/gi)) {
    const candidates = m[1].split(",").map((s) => s.trim().split(/\s+/)[0]);
    push(candidates[candidates.length - 1]);
  }
  // CSS background images (inline styles + stylesheets in the document).
  for (const m of html.matchAll(
    /background(?:-image)?\s*:[^;"'}]*url\(\s*['"]?([^'")]+)['"]?\s*\)/gi,
  ))
    push(m[1]);
  return [...new Set(urls)];
}

export interface FetchedLinkContext {
  pages: { url: string; text: string }[];
  images: InboundImage[];
}

/** Fetches candidate URLs; returns readable text + downloaded hero images. */
export async function fetchLinkContext(urls: string[]): Promise<FetchedLinkContext> {
  const pages: { url: string; text: string }[] = [];
  const images: InboundImage[] = [];

  for (const url of urls.slice(0, MAX_PAGES)) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
        redirect: "follow",
        signal: AbortSignal.timeout(10_000),
      });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("html")) continue;
      const html = await res.text();
      const text = stripHtml(html).slice(0, MAX_PAGE_CHARS);
      if (text.length > 100) pages.push({ url: res.url, text });

      // Pull the page's imagery for the vision pass + hero upload. Fetch a
      // wide candidate pool (skipping brand-asset URLs), then keep the
      // LARGEST files — renderings are megabytes, wordmarks are kilobytes,
      // and DOM order always puts the header logo first.
      const fetched: { buf: Buffer; type: string }[] = [];
      for (const imgUrl of imageUrls(html, res.url)) {
        if (fetched.length >= MAX_FETCH_IMAGES) break;
        if (LOGOISH_URL_RE.test(imgUrl)) continue;
        try {
          const imgRes = await fetch(imgUrl, {
            headers: { "User-Agent": UA },
            redirect: "follow",
            signal: AbortSignal.timeout(10_000),
          });
          const imgType = (imgRes.headers.get("content-type") ?? "")
            .split(";")[0]
            .trim()
            .toLowerCase()
            .replace("image/jpg", "image/jpeg");
          if (!imgRes.ok || !IMAGE_TYPES.includes(imgType)) continue;
          const buf = Buffer.from(await imgRes.arrayBuffer());
          if (buf.length < MIN_IMAGE_BYTES || buf.length > MAX_IMAGE_BYTES) continue;
          fetched.push({ buf, type: imgType });
        } catch {
          /* skip unreachable image */
        }
      }
      fetched.sort((a, b) => b.buf.length - a.buf.length);
      for (const f of fetched.slice(0, MAX_LINK_IMAGES - images.length)) {
        images.push({
          media_type: f.type as InboundImage["media_type"],
          data: f.buf.toString("base64"),
        });
      }
    } catch {
      /* skip unreachable page — extraction proceeds on whatever we have */
    }
  }

  return { pages, images };
}
