import { INDEXNOW_KEY } from "@/lib/indexnow";

/** IndexNow key verification file (https://liqwd.ca/<key>.txt). */
export function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
