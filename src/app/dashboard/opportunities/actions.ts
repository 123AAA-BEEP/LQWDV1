"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifications } from "@/lib/notifications";

function num(formData: FormData, key: string): number | null {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * A realtor places a bid on an open opportunity, moving commission / incentive /
 * price up or down. The developer is notified so it lands in their feed.
 */
export async function placeBid(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") ?? "");
  if (!opportunityId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const commission = num(formData, "bid_commission_percent");
  const incentive = num(formData, "bid_incentive_amount");
  const price = num(formData, "bid_price");
  const message = String(formData.get("message") ?? "").trim();

  if (commission === null && incentive === null && price === null && !message) {
    redirect(
      `/dashboard/opportunities/${opportunityId}?error=` +
        encodeURIComponent("Enter at least one term or a message to bid."),
    );
  }

  const { error } = await supabase.from("opportunity_bids").insert({
    opportunity_id: opportunityId,
    realtor_id: user.id,
    bid_commission_percent: commission,
    bid_incentive_amount: incentive,
    bid_price: price,
    message: message || null,
    status: "open",
  });

  if (error) {
    redirect(
      `/dashboard/opportunities/${opportunityId}?error=` +
        encodeURIComponent(
          "Could not place your bid. The opportunity may no longer be open.",
        ),
    );
  }

  // Notify the owning developer (look up via service role — realtors can't read
  // the private opportunities table).
  const admin = createAdminClient();
  const { data: opp } = await admin
    .from("opportunities")
    .select("developer_id, title")
    .eq("id", opportunityId)
    .maybeSingle();
  if (opp?.developer_id) {
    await createNotifications([
      {
        user_id: opp.developer_id as string,
        type: "new_bid",
        title: "New bid on your opportunity",
        body: opp.title as string,
        link_url: `/dashboard/developer/${opportunityId}`,
        opportunity_id: opportunityId,
      },
    ]);
  }

  revalidatePath(`/dashboard/opportunities/${opportunityId}`);
  redirect(`/dashboard/opportunities/${opportunityId}?message=bid`);
}

/** Withdraws the realtor's own open bid. */
export async function withdrawBid(formData: FormData) {
  const opportunityId = String(formData.get("opportunity_id") ?? "");
  const bidId = String(formData.get("bid_id") ?? "");
  if (!bidId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("opportunity_bids")
    .update({ status: "withdrawn" })
    .eq("id", bidId)
    .eq("realtor_id", user.id);

  revalidatePath(`/dashboard/opportunities/${opportunityId}`);
  redirect(`/dashboard/opportunities/${opportunityId}?message=withdrawn`);
}
