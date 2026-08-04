/**
 * LIQWD email shells — framework-free, dependency-free, inline-styled.
 * Drop into any Node/TS project (or port the template strings anywhere).
 *
 * brandedEmail: the transactional shell — logo, card, one CTA button.
 * plainEmail:   the deliberate opposite for cold outreach — no logo, no
 *               card, no button, because Gmail's Promotions classifier (and
 *               the human eye) key on exactly those.
 *
 * Rebrand: change the wordmark line in brandedEmail and the footnote default.
 * Colors used: ink #0b1220, brand #0d9488, page #f1f5f9, border #e2e8f0,
 * body text #475569, muted #94a3b8.
 */

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

/**
 * Personal-note email shell for COLD OUTREACH — deliberately the opposite of
 * brandedEmail. No logo, no card, no button, no styling that reads
 * "newsletter": Gmail's Promotions classifier keys on exactly those, and a
 * recipient's eye does too. Just left-aligned text like a human typed it,
 * with the legally-required footer in small quiet type underneath.
 */
export function plainEmail(opts: { body: string; footnote: string }): string {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;max-width:560px;padding:16px 20px;">
      ${opts.body}
      <p style="font-size:11px;line-height:1.5;color:#9ca3af;margin-top:32px;">${opts.footnote}</p>
    </div>
  </body>
</html>`;
}
