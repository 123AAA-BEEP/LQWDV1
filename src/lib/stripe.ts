import "server-only";
import Stripe from "stripe";

/**
 * Stripe powers the self-serve paid surfaces and is OPTIONAL. When a product's
 * env vars are absent, that surface falls back to a "coming soon" state.
 *
 *   STRIPE_SECRET_KEY              — server secret (sk_...)
 *   STRIPE_WEBHOOK_SECRET          — signing secret for /api/stripe/webhook
 *   STRIPE_PRO_PRICE_ID            — recurring Price for realtor Pro ($9.99/mo)
 *   STRIPE_PRO_PRICE_LABEL         — optional, e.g. "$9.99 / mo"
 *   STRIPE_ULTRA_PRICE_ID          — recurring Price for realtor Ultra ($19.99/mo)
 *   STRIPE_ULTRA_PRICE_LABEL       — optional, e.g. "$19.99 / mo"
 *   STRIPE_DEVELOPER_PRICE_ID      — recurring Price for developer access
 *   STRIPE_DEVELOPER_PRICE_LABEL   — optional, e.g. "$199 / mo"
 *   STRIPE_CONNECT_CREDITS_PRICE_ID    — one-time Price for a connect-credit pack
 *   STRIPE_CONNECT_CREDITS_PRICE_LABEL — optional, e.g. "$49 for 10 connects"
 *   STRIPE_CONNECT_CREDITS_QTY         — credits granted per pack (default 10)
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRO_PRICE_ID);
}

/** Ultra ($19.99/mo) — paid top tier that also unlocks Deal Desk. */
export function isUltraSubConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_ULTRA_PRICE_ID,
  );
}

/** Developer subscription (unlimited connects) is available. */
export function isDeveloperSubConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_DEVELOPER_PRICE_ID,
  );
}

/** À-la-carte connect-credit packs are available. */
export function isConnectCreditsConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONNECT_CREDITS_PRICE_ID,
  );
}

export const proPriceLabel = process.env.STRIPE_PRO_PRICE_LABEL ?? null;
export const ultraPriceLabel = process.env.STRIPE_ULTRA_PRICE_LABEL ?? null;
export const developerPriceLabel = process.env.STRIPE_DEVELOPER_PRICE_LABEL ?? null;
export const connectCreditsLabel =
  process.env.STRIPE_CONNECT_CREDITS_PRICE_LABEL ?? null;
export const connectCreditsPerPack = Number(
  process.env.STRIPE_CONNECT_CREDITS_QTY ?? "10",
);

let client: Stripe | null = null;

/** Singleton Stripe client, or null when not configured. */
export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
