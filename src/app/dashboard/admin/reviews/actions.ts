"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/admin";
import { sendEmail, brandedEmail } from "@/lib/email";
import { redirectWithFlash } from "@/lib/flash";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Moderates a client review: approve publishes it on the agent's public
 * profile (and tells the agent — the celebration is half the loop); reject
 * keeps it stored but never shown. Admin-only.
 */
export async function moderateReview(formData: FormData) {
  const id = String(formData.get("review_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["approved", "rejected"].includes(decision)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data: review } = await supabase
    .from("agent_reviews")
    .update({ status: decision, moderated_at: new Date().toISOString() })
    .eq("id", id)
    .select("agent_profile_id, reviewer_name, rating")
    .maybeSingle();

  revalidatePath("/dashboard/admin/reviews");

  // Tell the agent their review is live — fire-and-forget.
  if (decision === "approved" && review) {
    const admin = createAdminClient();
    const { data: agent } = await admin
      .from("profiles")
      .select("email, first_name, slug")
      .eq("id", review.agent_profile_id)
      .maybeSingle();
    if (agent?.email) {
      const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
      void sendEmail({
        to: agent.email,
        subject: `Your ${review.rating}★ review from ${review.reviewer_name} is live`,
        html: brandedEmail({
          heading: "A client review just went live on your page",
          body:
            `Hi ${esc(agent.first_name ?? "there")}, ${esc(review.reviewer_name)}'s ` +
            `${review.rating}★ review passed verification and is now on your ` +
            `public profile. Reviews compound — send your review link to ` +
            `another past client while the momentum's going.`,
          ctaUrl: agent.slug
            ? `${base}/realtors/${agent.slug}#reviews`
            : `${base}/dashboard/my-page`,
          ctaLabel: "See it live",
        }),
      });
    }
  }

  redirectWithFlash(
    "/dashboard/admin/reviews",
    decision === "approved"
      ? "Review approved — it's live on the agent's profile."
      : "Review rejected — it will never be shown.",
  );
}
