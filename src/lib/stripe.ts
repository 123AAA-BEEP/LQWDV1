import "server-only";
import Stripe from "stripe";

/**
 * Stripe is OPTIONAL. The paid Ultra path only activates when these env vars
 * are present; otherwise the Ultra page falls back to a contact CTA and admins
 * can still grant Ultra by hand. Keeps local/dev and unconfigured deploys safe.
 *
 *   STRIPE_SECRET_KEY        — server secret (sk_...)
 *   STRIPE_ULTRA_PRICE_ID    — the recurring Price for Ultra (price_...)
 *   STRIPE_WEBHOOK_SECRET    — signing secret for the webhook endpoint (whsec_...)
 *   STRIPE_ULTRA_PRICE_LABEL — optional display string, e.g. "$49 / mo"
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_ULTRA_PRICE_ID);
}

export const ultraPriceLabel = process.env.STRIPE_ULTRA_PRICE_LABEL ?? null;

let client: Stripe | null = null;

/** Returns a singleton Stripe client, or null when not configured. */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return client;
}
