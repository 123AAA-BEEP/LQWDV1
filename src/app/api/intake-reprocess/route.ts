import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractProjectFromEmail } from "@/lib/email-intake/extract";
import { ingestExtractedProject } from "@/lib/email-intake/ingest";
import {
  extractCandidateUrls,
  fetchLinkContext,
} from "@/lib/email-intake/fetch-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Re-runs failed email intakes from the stored raw email. An intake errors
 * when the extractor can't run (typically: API credits exhausted) — the
 * original email text/html is kept in email_intake_log, so the same
 * extract → ingest pipeline can be replayed once the API is back. The log row
 * is updated IN PLACE so the admin intake view reflects the re-run.
 *
 *   ?limit=3   error rows per run (max 5)
 *   ?id=…      reprocess one specific log row (any action)
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 *
 * Attachments aren't persisted, so replays run without inbound images —
 * hero-sourcing fills imagery afterwards, same as discovery publishes.
 */

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

interface LogRow {
  id: string;
  from_email: string | null;
  subject: string | null;
  raw_text: string | null;
  raw_html: string | null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  const admin = createAdminClient();
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "3", 10) || 3, 5);
  const onlyId = url.searchParams.get("id");

  let q = admin
    .from("email_intake_log")
    .select("id, from_email, subject, raw_text, raw_html")
    .order("received_at", { ascending: true })
    .limit(limit);
  q = onlyId ? q.eq("id", onlyId) : q.eq("action", "error");
  const { data } = await q;
  const rows = (data ?? []) as LogRow[];

  const results: { id: string; subject: string | null; action: string; notes: string }[] = [];

  for (const row of rows) {
    if (!row.raw_text && !row.raw_html) {
      results.push({
        id: row.id,
        subject: row.subject,
        action: "skipped",
        notes: "no stored email content to replay",
      });
      continue;
    }

    try {
      // The original run may have already merged fetched-link content into
      // raw_text — only re-fetch links when it never got that far.
      let text = row.raw_text;
      let images = [] as Awaited<ReturnType<typeof fetchLinkContext>>["images"];
      if (!text?.includes("--- CONTENT FETCHED FROM LINK")) {
        const linkCtx = await Promise.race([
          fetchLinkContext(extractCandidateUrls(row.raw_text, row.raw_html)),
          new Promise<{ pages: never[]; images: never[] }>((r) =>
            setTimeout(() => r({ pages: [], images: [] }), 22_000),
          ),
        ]);
        text =
          [
            row.raw_text ?? "",
            ...linkCtx.pages.map(
              (p) => `\n\n--- CONTENT FETCHED FROM LINK ${p.url} ---\n${p.text}`,
            ),
          ]
            .join("")
            .trim() || null;
        images = linkCtx.images;
      }

      const ex = await extractProjectFromEmail({
        subject: row.subject,
        text,
        html: row.raw_html,
        images,
      });
      if (!ex) {
        results.push({
          id: row.id,
          subject: row.subject,
          action: "error",
          notes: "extraction failed again — check API credits/logs",
        });
        continue;
      }

      const result = await ingestExtractedProject(ex, {
        from: row.from_email,
        subject: row.subject,
        images,
      });

      await admin
        .from("email_intake_log")
        .update({
          raw_text: text,
          extracted: ex,
          confidence: ex.confidence,
          action: result.action,
          project_id: result.project_id,
          published: result.published,
          notes: `[reprocessed] ${result.notes}`,
        })
        .eq("id", row.id);

      results.push({
        id: row.id,
        subject: row.subject,
        action: result.action,
        notes: result.notes,
      });
    } catch (e) {
      results.push({
        id: row.id,
        subject: row.subject,
        action: "error",
        notes: e instanceof Error ? e.message.slice(0, 200) : String(e),
      });
    }
  }

  const { count: remaining } = await admin
    .from("email_intake_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "error");

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    reprocessed: results.length,
    results,
    errors_remaining: remaining ?? 0,
  });
}
