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
 * Assignment Desk seeding intake — the cold-outreach landing form. No signup
 * wall: capture the agent + listing basics, nudge ops, and the thank-you
 * state walks them into signup + verification. The listing itself only ever
 * exists on the gated board after they verify (spec invariant: gated, never
 * public).
 */
export async function submitAssignmentIntake(
  formData: FormData,
): Promise<{ error?: string } | void> {
  // Honeypot — bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return;

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const brokerage = String(formData.get("brokerage") ?? "").trim().slice(0, 160);
  const project_name = String(formData.get("project_name") ?? "")
    .trim()
    .slice(0, 200);
  const city_region = String(formData.get("city_region") ?? "")
    .trim()
    .slice(0, 120);
  const priceRaw = String(formData.get("assignment_price") ?? "").replace(
    /[^0-9.]/g,
    "",
  );
  const assignment_price = priceRaw ? Number(priceRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim().slice(0, 2000);
  const source = String(formData.get("source") ?? "").trim().slice(0, 120);

  if (!name || !email) {
    return { error: "Please provide your name and email." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("assignment_intake").insert({
    name,
    email,
    phone: phone || null,
    brokerage: brokerage || null,
    project_name: project_name || null,
    city_region: city_region || null,
    assignment_price:
      assignment_price != null && Number.isFinite(assignment_price)
        ? assignment_price
        : null,
    notes: notes || null,
    source: source || null,
    status: "new",
  });
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  // Ops follow-up nudge — these are hand-picked outreach targets; speed wins.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const details = [
    `<strong>Name:</strong> ${esc(name)}`,
    `<strong>Email:</strong> ${esc(email)}`,
    phone ? `<strong>Phone:</strong> ${esc(phone)}` : null,
    brokerage ? `<strong>Brokerage:</strong> ${esc(brokerage)}` : null,
    project_name ? `<strong>Project:</strong> ${esc(project_name)}` : null,
    city_region ? `<strong>City:</strong> ${esc(city_region)}` : null,
    assignment_price
      ? `<strong>Asking:</strong> $${assignment_price.toLocaleString("en-CA")}`
      : null,
    notes ? `<strong>Notes:</strong> ${esc(notes)}` : null,
    source ? `<strong>Source:</strong> ${esc(source)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");
  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: email,
    subject: `Assignment Desk intake: ${name}${city_region ? ` (${city_region})` : ""}`,
    html: brandedEmail({
      heading: "New Assignment Desk seeding lead",
      body:
        `An agent wants to list an assignment — follow up fast, these are ` +
        `warm.<br><br>${details}`,
      ctaUrl: `${base}/dashboard/admin`,
      ctaLabel: "Open the admin console",
    }),
  });
}
