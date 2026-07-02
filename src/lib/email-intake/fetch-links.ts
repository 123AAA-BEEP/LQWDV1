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
const MAX_LINK_IMAGES = 4;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

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

/** Hero-image candidates from a fetched page, in preference order. */
function imageUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const push = (raw: string | undefined) => {
    if (!raw) return;
    try {
      urls.push(new URL(raw, baseUrl).toString());
    } catch {
      /* ignore */
    }
  };
  push(html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1]);
  push(html.match(/content=["']([^"']+)["'][^>]*property=["']og:image["']/i)?.[1]);
  push(html.match(/name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1]);
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) push(m[1]);
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

      // Pull the page's hero rendering(s) for the vision pass + hero upload.
      for (const imgUrl of imageUrls(html, res.url)) {
        if (images.length >= MAX_LINK_IMAGES) break;
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
          if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) continue;
          images.push({
            media_type: imgType as InboundImage["media_type"],
            data: buf.toString("base64"),
          });
        } catch {
          /* skip unreachable image */
        }
      }
    } catch {
      /* skip unreachable page — extraction proceeds on whatever we have */
    }
  }

  return { pages, images };
}
