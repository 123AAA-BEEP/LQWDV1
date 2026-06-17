import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Subscription states that should keep Ultra unlocked.
const ACTIVE_STATES = new Set(["active", "trialing", "past_due"]);

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  async function setTierByCustomer(
    customerId: string,
    tier: "free" | "ultra",
    subscriptionId: string | null,
  ) {
    await admin
      .from("profiles")
      .update({ tier, stripe_subscription_id: subscriptionId })
      .eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      const customerId =
        typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      const subscriptionId =
        typeof s.subscription === "string"
          ? s.subscription
          : s.subscription?.id ?? null;

      // Match by user id (most reliable) and backfill the customer id.
      if (userId) {
        await admin
          .from("profiles")
          .update({
            tier: "ultra",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq("id", userId);
      } else if (customerId) {
        await setTierByCustomer(customerId, "ultra", subscriptionId);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      // A scheduled cancel (cancel_at_period_end) stays Ultra until the period
      // actually ends — the subscription.deleted event downgrades then.
      const active = ACTIVE_STATES.has(sub.status);
      await setTierByCustomer(customerId, active ? "ultra" : "free", sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await setTierByCustomer(customerId, "free", null);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
