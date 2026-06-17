"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requireUserProfile, isDeveloper } from "@/lib/auth";
import {
  getStripe,
  isDeveloperSubConfigured,
  isConnectCreditsConfigured,
  connectCreditsPerPack,
} from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

async function origin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

/** Ensures the profile has a Stripe customer; returns its id. */
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

/** Developer subscription → unlimited connects (flips developer_mandate_access). */
export async function startDeveloperSubscription() {
  const { userId, email, profile } = await requireUserProfile();
  const stripe = getStripe();
  if (!isDeveloper(profile) || !isDeveloperSubConfigured() || !stripe) {
    redirect("/dashboard/developer");
  }

  const customerId = await ensureCustomer(
    stripe!,
    userId,
    email,
    profile.stripe_customer_id,
  );
  const base = await origin();
  const session = await stripe!.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_DEVELOPER_PRICE_ID!, quantity: 1 }],
    client_reference_id: userId,
    metadata: { profile_id: userId, kind: "developer" },
    subscription_data: { metadata: { profile_id: userId, kind: "developer" } },
    success_url: `${base}/dashboard/developer?status=subscribed`,
    cancel_url: `${base}/dashboard/developer`,
    allow_promotion_codes: true,
  });
  if (!session.url) redirect("/dashboard/developer");
  redirect(session.url);
}

/** À-la-carte: buy a pack of connect credits (one-time payment). */
export async function buyConnectCredits() {
  const { userId, email, profile } = await requireUserProfile();
  const stripe = getStripe();
  if (!isDeveloper(profile) || !isConnectCreditsConfigured() || !stripe) {
    redirect("/dashboard/developer");
  }

  const customerId = await ensureCustomer(
    stripe!,
    userId,
    email,
    profile.stripe_customer_id,
  );
  const base = await origin();
  const session = await stripe!.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_CONNECT_CREDITS_PRICE_ID!, quantity: 1 }],
    client_reference_id: userId,
    metadata: {
      profile_id: userId,
      kind: "connect_credits",
      qty: String(connectCreditsPerPack),
    },
    success_url: `${base}/dashboard/developer?status=credits`,
    cancel_url: `${base}/dashboard/developer`,
  });
  if (!session.url) redirect("/dashboard/developer");
  redirect(session.url);
}

/** Stripe billing portal for developers. */
export async function manageDeveloperBilling() {
  const { profile } = await requireUserProfile();
  const stripe = getStripe();
  if (!stripe || !profile.stripe_customer_id) redirect("/dashboard/developer");
  const base = await origin();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${base}/dashboard/developer`,
  });
  redirect(session.url);
}
