"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, brandedEmail } from "@/lib/email";

/**
 * "Work with {agent}" — the lead form on the public agent profile. Runs with
 * the service-role client so routing is trusted. Distinct from project leads
 * (no project context); lands in agent_contact_requests, alerts the agent
 * (reply-to = the buyer), and ops always gets a copy. The target must exist
 * in public_realtor_cards (approved + public) — you can't message a hidden
 * or unverified profile.
 */
export async function contactAgent(
  formData: FormData,
): Promise<{ error?: string } | void> {
  // Honeypot: real people never see or fill this field. Accept silently so
  // bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return;

  const profile_id = String(formData.get("profile_id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);

  if (!profile_id || !name || !email) {
    return { error: "Please provide your name and email." };
  }

  const admin = createAdminClient();

  // Only approved + public agents accept inquiries (view presence = both).
  const { data: card } = await admin
    .from("public_realtor_cards")
    .select("profile_id, first_name, last_name, email, slug")
    .eq("profile_id", profile_id)
    .maybeSingle();
  if (!card) {
    return { error: "This agent isn't accepting inquiries right now." };
  }

  const { error } = await admin.from("agent_contact_requests").insert({
    profile_id,
    name,
    email,
    phone: phone || null,
    message: message || null,
    status: "new",
  });
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  const agentName =
    [card.first_name, card.last_name].filter(Boolean).join(" ") || "the agent";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const details = [
    `<strong>Name:</strong> ${esc(name)}`,
    `<strong>Email:</strong> ${esc(email)}`,
    phone ? `<strong>Phone:</strong> ${esc(phone)}` : null,
    message ? `<strong>Message:</strong> ${esc(message)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");

  // Alert the agent — their lead, no referral fee. Fire-and-forget.
  const agentEmail = card.email as string | null;
  if (agentEmail) {
    await sendEmail({
      to: agentEmail,
      replyTo: email,
      subject: `New client inquiry from your LIQWD page`,
      html: brandedEmail({
        heading: "Someone wants to work with you",
        body:
          `A visitor on your public LIQWD page asked to work with you — ` +
          `they're yours, no referral fee. Reach out soon; early follow-ups ` +
          `convert best.<br><br>${details}`,
        ctaUrl: `${base}/dashboard/my-page`,
        ctaLabel: "Open your page settings",
      }),
    });
  }

  // Ops copy — every inquiry reaches LIQWD's records.
  await sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: email,
    subject: `Agent-page inquiry (LIQWD copy): ${agentName}`,
    html: brandedEmail({
      heading: `Inquiry for ${esc(agentName)}`,
      body:
        `A visitor asked to work with ${esc(agentName)} via /realtors/${esc(card.slug ?? "")}. ` +
        `This copy is for LIQWD's records.<br><br>${details}`,
      footnote: "LIQWD internal notification.",
    }),
  });
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
