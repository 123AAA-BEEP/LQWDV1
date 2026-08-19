import { getMicrositeByDomain, MICROSITE_SUBPAGES } from "@/lib/microsites";

export const dynamic = "force-dynamic";

/** Per-microsite sitemap: the home page + whichever sub-pages exist. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ domain: string }> },
) {
  const { domain } = await params;
  const config = await getMicrositeByDomain(domain);
  if (!config || config.status !== "live" || !config.content) {
    return new Response("not found", { status: 404 });
  }
  const c = config.content;
  const lastmod = (c.edited_at ?? c.generated_at ?? "").slice(0, 10) || undefined;
  const urls = [
    `https://${config.domain}/`,
    ...MICROSITE_SUBPAGES.filter((p) => c.pages?.[p.key]).map(
      (p) => `https://${config.domain}/${p.slug}`,
    ),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${u}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`,
      )
      .join("\n") +
    `\n</urlset>\n`;
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
