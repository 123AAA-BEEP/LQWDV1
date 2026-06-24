import { NextResponse } from "next/server";
import { runHeroSourcingBatch } from "@/lib/hero-sourcing";

export const dynamic = "force-dynamic";
// Vision + multiple fetches per project — give it room. Requires a Vercel plan
// that allows extended function duration.
export const maxDuration = 300;

/**
 * Hands-off hero-sourcing cron. Scheduled in vercel.json. Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`; when CRON_SECRET is set we require it,
 * so the endpoint can't be triggered by the public.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runHeroSourcingBatch(3);
  return NextResponse.json({ ranAt: new Date().toISOString(), ...result });
}
