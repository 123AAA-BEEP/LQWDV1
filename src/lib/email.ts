import "server-only";

/**
 * Transactional email sender (Resend HTTP API — no SDK dependency).
 *
 * Designed to be SAFE BEFORE IT'S CONFIGURED: if RESEND_API_KEY is unset,
 * `sendEmail` is a no-op that returns false instead of throwing. This lets
 * features that send mail (RECO expiry reminders, eBlasts, etc.) ship now and
 * "light up" the moment the key + sender domain are added in Vercel — see
 * docs/auth-emails/README.md for the Resend/DNS setup.
 */

const FROM = process.env.EMAIL_FROM ?? "LIQWD <no-reply@mail.liqwd.ca>";

/** True once Resend is configured. Use to gate UI like "email reminders on". */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/** Sends an email via Resend. Returns true on success, false if unconfigured
 *  or on error — never throws, so callers can fire-and-forget safely. */
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: SendEmailInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false; // not configured yet — no-op

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Wraps content in the shared LIQWD email shell (same look as the auth
 * templates in docs/auth-emails). Keep transactional mail visually consistent.
 */
export function brandedEmail(opts: {
  heading: string;
  body: string; // plain text or simple HTML for the intro paragraph(s)
  ctaUrl?: string;
  ctaLabel?: string;
  footnote?: string;
}): string {
  const { heading, body, ctaUrl, ctaLabel, footnote } = opts;
  const cta =
    ctaUrl && ctaLabel
      ? `<a href="${ctaUrl}" style="display:inline-block;background:#0b1220;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:10px;">${ctaLabel}</a>`
      : "";
  const foot =
    footnote ??
    "LIQWD &mdash; the broker portal for new homes in Ontario.";
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <tr><td style="padding:28px 32px 0;">
            <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#0b1220;">LIQWD<span style="color:#0d9488;">.</span></span>
          </td></tr>
          <tr><td style="padding:20px 32px 8px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#0b1220;">${heading}</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#475569;">${body}</p>
            ${cta}
          </td></tr>
          <tr><td style="padding:24px 32px 28px;">
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">${foot}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** Escapes user-supplied text before it goes into email HTML. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function siteBase(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
}

/**
 * "You're verified" welcome — sent whenever an agent becomes approved, whether
 * via admin review or the instant RECO-certificate path. Shared so both routes
 * stay identical. Fire-and-forget.
 */
export async function sendAgentVerifiedEmail(
  to: string,
  firstName: string | null,
): Promise<boolean> {
  const name = firstName?.trim() ? esc(firstName.trim()) : "there";
  return sendEmail({
    to,
    subject: "You're verified on LIQWD — start getting buyer leads",
    html: brandedEmail({
      heading: `You're verified, ${name}`,
      body:
        "Your LIQWD account is approved — you now have full broker access. " +
        "Start getting free buyer leads from new-home project pages, with no referral fees and no brokerage change. " +
        "The fastest way to begin: add or update a project to get matched as its agent, and buyer inquiries from its public page route straight to you.",
      ctaUrl: `${siteBase()}/dashboard/get-free-leads`,
      ctaLabel: "Start getting leads",
    }),
  });
}

/**
 * "We received your verification — under review" acknowledgment, sent the
 * moment an agent submits a RECO request for manual review. Fire-and-forget.
 */
export async function sendVerificationReceivedEmail(
  to: string,
  firstName: string | null,
): Promise<boolean> {
  const name = firstName?.trim() ? esc(firstName.trim()) : "there";
  return sendEmail({
    to,
    subject: "We received your LIQWD verification",
    html: brandedEmail({
      heading: "Verification received",
      body:
        `Thanks, ${name} — we've received your RECO verification and our team is reviewing it now. ` +
        "We'll email you the moment your account is approved (usually within one business day). " +
        "In the meantime, feel free to explore the dashboard and browse new-home projects.",
      ctaUrl: `${siteBase()}/dashboard`,
      ctaLabel: "Open your dashboard",
    }),
  });
}
