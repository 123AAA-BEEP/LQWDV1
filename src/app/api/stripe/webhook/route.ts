import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe needs the raw, unparsed body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Subscription states that keep an entitlement unlocked.
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

  // Pro tier (realtor). Never touches realtor_tier (Ultra stays invite-only).
  async function setPlanByCustomer(
    customerId: string,
    plan: "free" | "pro",
    subscriptionId: string | null,
  ) {
    await admin
      .from("profiles")
      .update({ plan, stripe_subscription_id: subscriptionId })
      .eq("stripe_customer_id", customerId);
  }

  // Developer unlimited-connect access.
  async function setDevAccessByCustomer(customerId: string, active: boolean) {
    await admin
      .from("profiles")
      .update({ developer_mandate_access: active })
      .eq("stripe_customer_id", customerId);
  }

  // À-la-carte credit top-up (one-time purchase).
  async function addCredits(userId: string, qty: number) {
    const { data } = await admin
      .from("profiles")
      .select("mandate_connect_credits")
      .eq("id", userId)
      .maybeSingle();
    const current = (data?.mandate_connect_credits as number | undefined) ?? 0;
    await admin
      .from("profiles")
      .update({ mandate_connect_credits: current + qty })
      .eq("id", userId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const kind = s.metadata?.kind;
      const userId = s.client_reference_id;
      const customerId =
        typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      const subscriptionId =
        typeof s.subscription === "string"
          ? s.subscription
          : s.subscription?.id ?? null;

      if (s.mode === "payment" && kind === "connect_credits") {
        const qty = Number(s.metadata?.qty ?? "0") || 0;
        if (userId && qty > 0) await addCredits(userId, qty);
        break;
      }

      if (s.mode === "subscription") {
        const updates =
          kind === "developer"
            ? { developer_mandate_access: true }
            : { plan: "pro" as const };
        if (userId) {
          await admin
            .from("profiles")
            .update({
              ...updates,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq("id", userId);
        } else if (customerId && kind === "developer") {
          await setDevAccessByCustomer(customerId, true);
        } else if (customerId) {
          await setPlanByCustomer(customerId, "pro", subscriptionId);
        }
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const active = ACTIVE_STATES.has(sub.status);
      if (sub.metadata?.kind === "developer") {
        await setDevAccessByCustomer(customerId, active);
      } else {
        await setPlanByCustomer(customerId, active ? "pro" : "free", sub.id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      if (sub.metadata?.kind === "developer") {
        await setDevAccessByCustomer(customerId, false);
      } else {
        await setPlanByCustomer(customerId, "free", null);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
