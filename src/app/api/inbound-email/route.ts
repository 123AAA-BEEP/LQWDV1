import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractProjectFromEmail,
  type InboundImage,
} from "@/lib/email-intake/extract";
import { ingestExtractedProject } from "@/lib/email-intake/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED_IMAGE = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Inbound email webhook for the email-to-project intake tool.
 *
 * An inbound-mail provider (SendGrid Inbound Parse) POSTs a forwarded developer
 * marketing email here as multipart/form-data (from / subject / text / html +
 * attachmentN files). We ack immediately and do the slow work (Claude extraction
 * + project create/publish) in `after()` so the provider never times out or
 * retries (which would double-process). Auth is a shared secret in the URL
 * (?key=…) — set INBOUND_EMAIL_SECRET in Vercel and append it to the Parse URL.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.INBOUND_EMAIL_SECRET;
  if (!expected || url.searchParams.get("key") !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.length ? v : null;
  };
  const from = get("from");
  const subject = get("subject");
  const text = get("text");
  const html = get("html");

  // Collect image attachments regardless of field naming (SendGrid uses
  // attachment1..N); ignore non-images (PDFs/spec sheets) for the vision pass.
  const images: InboundImage[] = [];
  for (const [, v] of form.entries()) {
    if (images.length >= MAX_IMAGES) break;
    if (!(v instanceof File)) continue;
    const mt = (v.type === "image/jpg" ? "image/jpeg" : v.type).toLowerCase();
    if (!ALLOWED_IMAGE.includes(mt) || v.size === 0 || v.size > MAX_IMAGE_BYTES) {
      continue;
    }
    try {
      const data = Buffer.from(await v.arrayBuffer()).toString("base64");
      images.push({ media_type: mt as InboundImage["media_type"], data });
    } catch {
      /* skip unreadable attachment */
    }
  }

  // Heavy lifting after the 200 so the provider gets an instant ack.
  after(async () => {
    const admin = createAdminClient();
    try {
      const ex = await extractProjectFromEmail({ subject, text, html, images });
      const result = ex
        ? await ingestExtractedProject(ex, { from, subject, images })
        : {
            action: "error" as const,
            project_id: null,
            published: false,
            notes: "Extraction unavailable (ANTHROPIC_API_KEY unset or parse failed).",
          };

      await admin.from("email_intake_log").insert({
        from_email: from,
        subject,
        raw_text: text,
        raw_html: html,
        attachment_count: images.length,
        extracted: ex ?? null,
        confidence: ex?.confidence ?? null,
        action: result.action,
        project_id: result.project_id,
        published: result.published,
        notes: result.notes,
      });
    } catch (e) {
      await admin.from("email_intake_log").insert({
        from_email: from,
        subject,
        raw_text: text,
        raw_html: html,
        attachment_count: images.length,
        action: "error",
        notes: e instanceof Error ? e.message : String(e),
      });
    }
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
