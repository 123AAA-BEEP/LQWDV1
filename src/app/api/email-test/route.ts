import { NextResponse } from "next/server";
import { brandedEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Outbound-email diagnostic. sendEmail() deliberately swallows errors (so
 * product flows can fire-and-forget), which also means a misconfigured
 * from-address fails silently — this runner makes the failure visible by
 * calling Resend directly and returning its status + response body.
 *
 *   ?to=you@example.com   destination (default LEADS_NOTIFY_EMAIL)
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 */

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Same FROM resolution as sendEmail — the thing under test.
  const from =
    process.env.EMAIL_FROM ??
    process.env.MAIL_FROM ??
    "LIQWD <no-reply@mail.liqwd.ca>";
  const to =
    url.searchParams.get("to") ??
    process.env.LEADS_NOTIFY_EMAIL ??
    "leads@getliqwd.com";
  const key = process.env.RESEND_API_KEY;

  const env = {
    RESEND_API_KEY: Boolean(key),
    EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
    MAIL_FROM: Boolean(process.env.MAIL_FROM),
    LEADS_NOTIFY_EMAIL: Boolean(process.env.LEADS_NOTIFY_EMAIL),
    BUSINESS_MAILING_ADDRESS: Boolean(process.env.BUSINESS_MAILING_ADDRESS),
    from_in_use: from,
    to_in_use: to,
  };

  if (!key) {
    return NextResponse.json({ ok: false, env, error: "RESEND_API_KEY not set" });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "LIQWD outbound email test",
      html: brandedEmail({
        heading: "Outbound email works",
        body: "This is a diagnostic send from /api/email-test. If you're reading this, app notifications (digests, lead alerts, verification pings) are flowing.",
        footnote: "LIQWD internal notification.",
      }),
    }),
  });

  const body = await res.text();
  return NextResponse.json({
    ok: res.ok,
    resend_status: res.status,
    resend_response: body.slice(0, 500),
    env,
  });
}
