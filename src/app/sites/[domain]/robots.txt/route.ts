import { getMicrositeByDomain } from "@/lib/microsites";

export const dynamic = "force-dynamic";

/**
 * Per-microsite robots.txt (foreign hosts rewrite /robots.txt here). Live
 * sites invite crawling and point at their own sitemap; anything else
 * (unknown domain, draft, retired) says stay out — the crawler-level twin of
 * the noindex holding page.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;
  const config = await getMicrositeByDomain(domain);
  const live = Boolean(config && config.status === "live" && config.content);
  const body = live
    ? `User-agent: *\nAllow: /\n\nSitemap: https://${config!.domain}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
