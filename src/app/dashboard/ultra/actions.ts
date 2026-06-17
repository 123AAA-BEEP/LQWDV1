"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUserProfile, isApproved, isUltra } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function origin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/**
 * Starts a Stripe Checkout (mode: subscription) for Ultra. The tier flip
 * happens in the webhook on checkout.session.completed — never client-side.
 * Requires a verified (approved) realtor.
 */
export async function startCheckout() {
  const { userId, email, profile } = await requireUserProfile();
  const stripe = getStripe();

  if (!isStripeConfigured() || !stripe) redirect("/dashboard/ultra");
  if (isUltra(profile)) redirect("/dashboard/ultra");
  if (!isApproved(profile)) redirect("/dashboard/verify");

  // Reuse the customer if we've created one before; otherwise create + persist.
  let customerId = profile.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { profile_id: userId },
    });
    customerId = customer.id;
    await createAdminClient()
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const base = await origin();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_ULTRA_PRICE_ID!, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: { metadata: { profile_id: userId } },
    success_url: `${base}/dashboard/ultra?upgraded=1`,
    cancel_url: `${base}/dashboard/ultra`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/dashboard/ultra");
  redirect(session.url);
}

/** Opens the Stripe billing portal so Ultra members can manage/cancel. */
export async function manageBilling() {
  const { profile } = await requireUserProfile();
  const stripe = getStripe();

  if (!stripe || !profile.stripe_customer_id) redirect("/dashboard/ultra");

  const base = await origin();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${base}/dashboard/ultra`,
  });

  redirect(session.url);
}
