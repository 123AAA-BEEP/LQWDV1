import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyUnsubscribeToken,
  addSuppression,
} from "@/lib/email-compliance";

export const dynamic = "force-dynamic";

/**
 * One-click unsubscribe (CASL/CAN-SPAM). The link carries an HMAC token so a
 * third party can't suppress someone else's address. Takes effect immediately
 * and applies to ALL LIQWD campaigns.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";

  const valid = Boolean(email) && verifyUnsubscribeToken(email, token);
  if (valid) {
    const admin = createAdminClient();
    await addSuppression(admin, email, "unsubscribe_link", "one_click");
  }

  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${
    valid ? "Unsubscribed" : "Invalid link"
  } — LIQWD</title><body style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px"><div style="max-width:26rem;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center"><p style="font-size:20px;font-weight:700;letter-spacing:-.01em;margin:0 0 6px">LIQWD<span style="color:#14b8a6">.</span></p>${
    valid
      ? `<h1 style="font-size:18px;margin:12px 0 8px">You're unsubscribed</h1><p style="font-size:14px;color:#475569;line-height:1.6;margin:0">We won't email <strong>${email.replace(/</g, "&lt;")}</strong> again — this takes effect immediately and covers all LIQWD mailings.</p>`
      : `<h1 style="font-size:18px;margin:12px 0 8px">This link isn't valid</h1><p style="font-size:14px;color:#475569;line-height:1.6;margin:0">The unsubscribe link appears incomplete. Reply "remove" to any email from us and we'll take you off the list manually.</p>`
  }</div></body>`;
  return new Response(html, { headers: { "content-type": "text/html" } });
}
