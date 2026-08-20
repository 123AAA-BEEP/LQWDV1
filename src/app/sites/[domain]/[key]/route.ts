import { INDEXNOW_KEY } from "@/lib/indexnow";
import { getMicrositeByDomain } from "@/lib/microsites";

export const dynamic = "force-dynamic";

/**
 * Catch-all single-segment route on microsite domains. Serves two
 * ownership-verification files and nothing else:
 *
 *   /{indexnow-key}.txt   — IndexNow verifies by fetching it from the SAME
 *                           host being submitted.
 *   /googleXXXX.html      — Google Search Console's URL-prefix file method,
 *                           when that filename is stored on the config.
 *
 * Everything else is a plain 404, so junk paths never render liqwd.ca
 * chrome on a microsite domain. Static siblings (floor-plans, pricing,
 * robots.txt, …) win over this dynamic segment.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string; key: string }> },
) {
  const { domain, key } = await params;
  if (key === `${INDEXNOW_KEY}.txt`) {
    return new Response(INDEXNOW_KEY, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (/^google[a-z0-9]+\.html$/i.test(key)) {
    const config = await getMicrositeByDomain(domain);
    if (config?.google_verification === key) {
      // GSC expects exactly this line as the file's body.
      return new Response(`google-site-verification: ${key}`, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  }

  return new Response("not found", { status: 404 });
}
