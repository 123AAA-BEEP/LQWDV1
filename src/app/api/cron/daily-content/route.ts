import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDailyContent } from "@/lib/daily-content";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily content pipeline (scheduled in vercel.json — Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`). Drafts a project-of-the-day
 * spotlight and a sourced market note into the article REVIEW QUEUE
 * (status='in_review') and emails ops. Publishing stays human — this cron
 * can only ever add to the queue, and it skips itself while the unreviewed
 * queue is at capacity. See src/lib/daily-content.ts.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runDailyContent(createAdminClient());
  return NextResponse.json(result);
}
