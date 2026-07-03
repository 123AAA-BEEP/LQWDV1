import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { EmailLaw } from "@/lib/regions";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Commercial-email compliance for outbound campaigns.
 *
 * CASL (Canada): identify the sender (name + mailing address + contact),
 * provide a no-cost unsubscribe honoured promptly (we honour instantly;
 * the law allows up to 10 business days), and only send on a consent basis —
 * ours is implied consent via conspicuous publication of a business contact
 * relevant to the recipient's role (s.10(9)(b)), which is why every invite
 * references the recipient's own published listing.
 *
 * CAN-SPAM (US): no deceptive headers/subjects, identify the message as an
 * ad, include a valid physical postal address, and provide a working opt-out
 * honoured within 10 business days (again: we honour instantly).
 *
 * Suppression is global and permanent: any address on email_suppressions is
 * excluded from every campaign, regardless of which campaign added it.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");

/** Physical mailing address — REQUIRED for CAN-SPAM, best-practice for CASL. */
function mailingAddress(): string {
  return (
    process.env.BUSINESS_MAILING_ADDRESS ??
    "LIQWD, Toronto, Ontario, Canada"
  );
}

function secret(): string {
  return process.env.INBOUND_EMAIL_SECRET ?? "liqwd-unsubscribe";
}

/** HMAC token so unsubscribe links can't be forged to suppress other people. */
export function unsubscribeToken(email: string): string {
  return createHmac("sha256", secret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = unsubscribeToken(email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function unsubscribeUrl(email: string): string {
  return `${SITE}/unsubscribe?e=${encodeURIComponent(email.trim().toLowerCase())}&t=${unsubscribeToken(email)}`;
}

/**
 * The legally-required footer block for a commercial email, per regime.
 * Append inside the branded template's footnote area.
 */
export function complianceFootnote(opts: {
  law: EmailLaw;
  email: string;
  consentContext: string; // one line: why they're receiving this
}): string {
  const unsub = unsubscribeUrl(opts.email);
  const addr = mailingAddress();
  const base =
    `${opts.consentContext} ` +
    `<a href="${unsub}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a> ` +
    `to stop all future emails from LIQWD (takes effect immediately), or reply "remove". ` +
    `LIQWD · ${addr} · liqwd.ca`;
  if (opts.law === "can_spam") {
    // CAN-SPAM: identify as an advertisement + physical postal address.
    return `This is a commercial advertisement from LIQWD. ${base}`;
  }
  return base;
}

/** Lower-cased set of suppressed addresses among `emails`. */
export async function suppressedAmong(
  admin: Admin,
  emails: string[],
): Promise<Set<string>> {
  const wanted = [...new Set(emails.map((e) => e.trim().toLowerCase()))];
  if (wanted.length === 0) return new Set();
  const { data } = await admin
    .from("email_suppressions")
    .select("email")
    .in("email", wanted);
  return new Set(
    ((data ?? []) as { email: string }[]).map((r) => r.email.toLowerCase()),
  );
}

export async function addSuppression(
  admin: Admin,
  email: string,
  reason: string,
  source: string,
): Promise<void> {
  // A unique violation just means the address is already suppressed — fine.
  await admin
    .from("email_suppressions")
    .insert({ email: email.trim().toLowerCase(), reason, source });
}
