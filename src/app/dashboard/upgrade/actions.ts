"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUserProfile } from "@/lib/auth";
import { getStripe, isStripeConfigured, isUltraSubConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function origin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

async function ensureCustomer(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  userId: string,
  email: string | null,
  existing: string | null,
): Promise<string> {
  if (existing) return existing;
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { profile_id: userId },
  });
  await createAdminClient()
    .from("profiles")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId);
  return customer.id;
}

/**
 * Subscription checkout for a realtor plan. The plan flip happens in the webhook
 * (kind = 'pro' | 'ultra') — never client-side. Ultra ($19.99) is the top tier
 * and also unlocks Deal Desk; Pro ($9.99) is the tooling tier.
 */
async function startPlanCheckout(plan: "pro" | "ultra") {
  const { userId, email, profile } = await requireUserProfile();
  const stripe = getStripe();
  const priceId =
    plan === "ultra"
      ? process.env.STRIPE_ULTRA_PRICE_ID
      : process.env.STRIPE_PRO_PRICE_ID;

  if (!stripe || !priceId) redirect("/dashboard/upgrade");
  // Already on this tier (or higher) → nothing to buy.
  if (profile.plan === plan || (plan === "pro" && profile.plan === "ultra")) {
    redirect("/dashboard/upgrade");
  }

  const customerId = await ensureCustomer(
    stripe,
    userId,
    email,
    profile.stripe_customer_id,
  );
  const base = await origin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: userId,
    metadata: { profile_id: userId, kind: plan },
    subscription_data: { metadata: { profile_id: userId, kind: plan } },
    success_url: `${base}/dashboard/upgrade?upgraded=${plan}`,
    cancel_url: `${base}/dashboard/upgrade`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/dashboard/upgrade");
  redirect(session.url);
}

export async function startCheckout() {
  if (!isStripeConfigured()) redirect("/dashboard/upgrade");
  await startPlanCheckout("pro");
}

export async function startUltraCheckout() {
  if (!isUltraSubConfigured()) redirect("/dashboard/upgrade");
  await startPlanCheckout("ultra");
}

/** Opens the Stripe billing portal so members can manage/cancel. */
export async function manageBilling() {
  const { profile } = await requireUserProfile();
  const stripe = getStripe();
  if (!stripe || !profile.stripe_customer_id) redirect("/dashboard/upgrade");

  const base = await origin();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${base}/dashboard/upgrade`,
  });
  redirect(session.url);
}
