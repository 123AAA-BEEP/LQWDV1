import { INDEXNOW_KEY } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/**
 * Catch-all single-segment route on microsite domains. Serves the IndexNow
 * key file (https://{domain}/{key}.txt — the protocol verifies ownership by
 * fetching it from the SAME host being submitted); everything else is a
 * plain 404 so junk paths never render liqwd.ca chrome on a microsite
 * domain. Static siblings (floor-plans, pricing, robots.txt, …) win over
 * this dynamic segment.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  if (key === `${INDEXNOW_KEY}.txt`) {
    return new Response(INDEXNOW_KEY, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new Response("not found", { status: 404 });
}
