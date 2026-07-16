"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, brandedEmail } from "@/lib/email";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Public review submission for a verified agent's profile. Mirrors
 * contactAgent: honeypot, service-role insert, target must be live in
 * public_realtor_cards. Every review lands as `pending` — nothing publishes
 * until an admin approves it in the moderation queue (reviews agents reuse in
 * advertising must be genuine, so the human gate is the product). One review
 * per email per agent, enforced by a unique index.
 */
export async function submitAgentReview(
  formData: FormData,
): Promise<{ error?: string } | void> {
  // Honeypot: real people never see or fill this field. Accept silently so
  // bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return;

  const profile_id = String(formData.get("profile_id") ?? "");
  const reviewer_name = String(formData.get("reviewer_name") ?? "")
    .trim()
    .slice(0, 120);
  const reviewer_email = String(formData.get("reviewer_email") ?? "")
    .trim()
    .slice(0, 320);
  const rating = Number(formData.get("rating") ?? 0);
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  const worked_on = String(formData.get("worked_on") ?? "")
    .trim()
    .slice(0, 200);

  if (!profile_id || !reviewer_name || !reviewer_email) {
    return { error: "Please provide your name and email." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a star rating." };
  }
  if (body.length < 20) {
    return {
      error: "Please write at least a couple of sentences about your experience.",
    };
  }

  const admin = createAdminClient();

  // Only approved + public agents can be reviewed (view presence = both).
  const { data: card } = await admin
    .from("public_realtor_cards")
    .select("profile_id, first_name, last_name, slug")
    .eq("profile_id", profile_id)
    .maybeSingle();
  if (!card) {
    return { error: "This agent isn't accepting reviews right now." };
  }

  const { error } = await admin.from("agent_reviews").insert({
    agent_profile_id: profile_id,
    reviewer_name,
    reviewer_email,
    rating,
    body,
    worked_on: worked_on || null,
    status: "pending",
  });
  if (error) {
    // Unique index: one review per email per agent.
    if (error.code === "23505") {
      return {
        error:
          "It looks like you've already reviewed this agent. Each client can leave one review.",
      };
    }
    return { error: "Something went wrong. Please try again." };
  }

  // Nudge ops — reviews are useless sitting unmoderated. Fire-and-forget.
  const agentName =
    [card.first_name, card.last_name].filter(Boolean).join(" ") || "an agent";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    subject: `Review pending moderation: ${agentName} (${rating}★)`,
    html: brandedEmail({
      heading: `New review for ${esc(agentName)} — pending`,
      body:
        `<strong>${esc(reviewer_name)}</strong> (${esc(reviewer_email)}) left ` +
        `a ${rating}★ review. It stays hidden until approved.<br><br>` +
        `“${esc(body)}”`,
      ctaUrl: `${base}/dashboard/admin/reviews`,
      ctaLabel: "Open the moderation queue",
    }),
  });
}
