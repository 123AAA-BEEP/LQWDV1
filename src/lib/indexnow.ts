/**
 * IndexNow: instant URL submission to Bing/Yandex (and everything that reads
 * the IndexNow feed — including the indexes behind ChatGPT/Copilot search).
 * Google doesn't consume IndexNow; Google discovery comes from the sitemap +
 * internal links. The key is intentionally public — the protocol verifies it
 * by fetching /{key}.txt from this host (served by src/app/[key].txt route).
 */

export const INDEXNOW_KEY = "b7f3a9c25d1e48e6a0c4f82d9b5716aa";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca"
).replace(/\/+$/, "");

/**
 * Pings IndexNow with site-relative paths (e.g. "/projects/slug"). Call from
 * after() on publish. Fire-and-forget: never throws, no-op on empty input.
 */
export async function pingIndexNow(paths: string[]): Promise<void> {
  const urlList = [...new Set(paths)]
    .filter((p) => p.startsWith("/"))
    .map((p) => `${SITE_URL}${p}`);
  if (urlList.length === 0) return;
  try {
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    });
  } catch {
    /* search-engine ping must never affect the caller */
  }
}
