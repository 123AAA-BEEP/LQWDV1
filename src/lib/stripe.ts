import "server-only";
import Stripe from "stripe";

/**
 * Stripe powers the self-serve PRO tier and is OPTIONAL. When these env vars
 * are absent the upgrade surface falls back to a "coming soon" state and the
 * rest of the app is unaffected.
 *
 *   STRIPE_SECRET_KEY      — server secret (sk_...)
 *   STRIPE_PRO_PRICE_ID    — the recurring Price for Pro (price_...)
 *   STRIPE_WEBHOOK_SECRET  — signing secret for /api/stripe/webhook (whsec_...)
 *   STRIPE_PRO_PRICE_LABEL — optional display string, e.g. "$9.99 / mo"
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

export const proPriceLabel = process.env.STRIPE_PRO_PRICE_LABEL ?? null;

let client: Stripe | null = null;

/** Singleton Stripe client, or null when not configured. */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
