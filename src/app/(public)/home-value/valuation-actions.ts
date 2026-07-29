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

const PROPERTY_TYPES = ["detached", "semi", "townhouse", "condo", "other"];
const TIMELINES = ["asap", "3-6-months", "6-12-months", "just-curious"];

/**
 * Seller-lead capture from the /home-value funnel. Honest model — no fake
 * instant estimate: the promise is a free professional market assessment
 * (CMA) prepared by a local licensed agent. Service-role insert (RLS keeps
 * the table admin-only), honeypot-guarded, ops-notified.
 */
export async function submitValuationRequest(
  formData: FormData,
): Promise<{ error?: string } | void> {
  // Honeypot — bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return;

  const address = String(formData.get("address") ?? "").trim().slice(0, 240);
  const city = String(formData.get("city") ?? "").trim().slice(0, 120);
  const rawType = String(formData.get("property_type") ?? "");
  const property_type = PROPERTY_TYPES.includes(rawType) ? rawType : null;
  const beds = String(formData.get("beds") ?? "").trim().slice(0, 20);
  const baths = String(formData.get("baths") ?? "").trim().slice(0, 20);
  const rawTimeline = String(formData.get("timeline") ?? "");
  const timeline = TIMELINES.includes(rawTimeline) ? rawTimeline : null;
  const details = String(formData.get("details") ?? "").trim().slice(0, 2000);
  const owner_name = String(formData.get("owner_name") ?? "").trim().slice(0, 120);
  const owner_email = String(formData.get("owner_email") ?? "").trim().slice(0, 320);
  const owner_phone = String(formData.get("owner_phone") ?? "").trim().slice(0, 40);
  const source_city_slug = String(formData.get("source_city_slug") ?? "")
    .trim()
    .slice(0, 120);

  if (!address || !owner_name || !owner_email) {
    return { error: "Please provide the property address, your name, and email." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("valuation_requests").insert({
    address,
    city: city || null,
    property_type,
    beds: beds || null,
    baths: baths || null,
    timeline,
    details: details || null,
    owner_name,
    owner_email,
    owner_phone: owner_phone || null,
    source_city_slug: source_city_slug || null,
    status: "new",
  });
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  // Seller leads are the most time-sensitive lead class — ping ops now.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const rows = [
    `<strong>Address:</strong> ${esc(address)}`,
    city ? `<strong>City:</strong> ${esc(city)}` : null,
    property_type ? `<strong>Type:</strong> ${esc(property_type)}` : null,
    beds ? `<strong>Beds:</strong> ${esc(beds)}` : null,
    baths ? `<strong>Baths:</strong> ${esc(baths)}` : null,
    timeline ? `<strong>Timeline:</strong> ${esc(timeline)}` : null,
    `<strong>Owner:</strong> ${esc(owner_name)} · ${esc(owner_email)}${owner_phone ? ` · ${esc(owner_phone)}` : ""}`,
    details ? `<strong>Notes:</strong> ${esc(details)}` : null,
    source_city_slug ? `<strong>Landing page:</strong> /home-value/${esc(source_city_slug)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");
  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: owner_email,
    subject: `Home-value request: ${city || "unknown city"} (${timeline ?? "no timeline"})`,
    html: brandedEmail({
      heading: "New seller lead — home valuation request",
      body:
        "A homeowner asked what their place is worth. Route it to a local " +
        `agent for a CMA — speed decides these.<br><br>${rows}`,
      ctaUrl: `${base}/dashboard/admin/valuations`,
      ctaLabel: "Open the valuations queue",
    }),
  });
}
