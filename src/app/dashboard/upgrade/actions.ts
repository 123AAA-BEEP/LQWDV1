"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUserProfile, isPro } from "@/lib/auth";
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
 * Starts Stripe Checkout (mode: subscription) for the self-serve Pro tier.
 * The plan flip happens in the webhook on checkout.session.completed — never
 * client-side, and it sets `plan`, NOT realtor_tier (Ultra stays invite-only).
 */
export async function startCheckout() {
  const { userId, email, profile } = await requireUserProfile();
  const stripe = getStripe();

  if (!isStripeConfigured() || !stripe) redirect("/dashboard/upgrade");
  if (isPro(profile)) redirect("/dashboard/upgrade");

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
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    client_reference_id: userId,
    metadata: { profile_id: userId, kind: "pro" },
    subscription_data: { metadata: { profile_id: userId, kind: "pro" } },
    success_url: `${base}/dashboard/upgrade?upgraded=1`,
    cancel_url: `${base}/dashboard/upgrade`,
    allow_promotion_codes: true,
  });

  if (!session.url) redirect("/dashboard/upgrade");
  redirect(session.url);
}

/** Opens the Stripe billing portal so Pro members can manage/cancel. */
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
