import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractProjectFromEmail,
  type InboundImage,
} from "@/lib/email-intake/extract";
import { ingestExtractedProject } from "@/lib/email-intake/ingest";
import {
  extractCandidateUrls,
  fetchLinkContext,
} from "@/lib/email-intake/fetch-links";
import { sendEmail, brandedEmail } from "@/lib/email";

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
      // Hot-drop support: a forwarded email is often just a link to a thin
      // landing page. Follow up to two links, feed their text to the extractor,
      // and pull their hero renderings for the vision pass + hero upload.
      const linkCtx = await fetchLinkContext(extractCandidateUrls(text, html));
      const mergedText = [
        text ?? "",
        ...linkCtx.pages.map(
          (p) => `\n\n--- CONTENT FETCHED FROM LINK ${p.url} ---\n${p.text}`,
        ),
      ]
        .join("")
        .trim() || null;
      const mergedImages = [...images, ...linkCtx.images].slice(0, MAX_IMAGES);

      const ex = await extractProjectFromEmail({
        subject,
        text: mergedText,
        html,
        images: mergedImages,
      });
      const result = ex
        ? await ingestExtractedProject(ex, { from, subject, images: mergedImages })
        : {
            action: "error" as const,
            project_id: null,
            published: false,
            notes: "Extraction unavailable (ANTHROPIC_API_KEY unset or parse failed).",
          };

      await admin.from("email_intake_log").insert({
        from_email: from,
        subject,
        raw_text: mergedText,
        raw_html: html,
        attachment_count: mergedImages.length,
        extracted: ex ?? null,
        confidence: ex?.confidence ?? null,
        action: result.action,
        project_id: result.project_id,
        published: result.published,
        notes: result.notes,
      });

      // The owner asked to be pinged whenever an intake CAN'T go live on its
      // own (no geography / no corroboration / error) so a human can finish it.
      if (!result.published) {
        await sendIntakeReviewPing({
          subject,
          action: result.action,
          notes: result.notes,
          projectId: result.project_id,
        });
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await admin.from("email_intake_log").insert({
        from_email: from,
        subject,
        raw_text: text,
        raw_html: html,
        attachment_count: images.length,
        action: "error",
        notes: message,
      });
      await sendIntakeReviewPing({
        subject,
        action: "error",
        notes: message,
        projectId: null,
      });
    }
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Ops alert when an intake lands as anything short of published — the email
 * came in hot but the machine couldn't finish the job (usually: no reliable
 * geography). Fire-and-forget; never blocks the pipeline.
 */
async function sendIntakeReviewPing(opts: {
  subject: string | null;
  action: string;
  notes: string;
  projectId: string | null;
}) {
  const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const ctaUrl = opts.projectId
    ? `${base}/dashboard/admin/projects/${opts.projectId}`
    : `${base}/dashboard/admin/email-intake`;

  await sendEmail({
    to,
    subject: `Intake needs review (${opts.action}): ${opts.subject ?? "no subject"}`,
    html: brandedEmail({
      heading: "An intake email couldn't auto-publish",
      body:
        `<strong>Email:</strong> ${escHtml(opts.subject ?? "(no subject)")}<br>` +
        `<strong>Outcome:</strong> ${escHtml(opts.action)}<br>` +
        `<strong>Why:</strong> ${escHtml(opts.notes)}<br><br>` +
        "Add the missing details (usually the city/address) and publish when ready.",
      ctaUrl,
      ctaLabel: opts.projectId ? "Open the draft" : "Open the intake log",
      footnote: "LIQWD internal notification.",
    }),
  });
}
