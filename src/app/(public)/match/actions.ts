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

const INTENTS = ["buying", "selling", "both"];
const PROPERTY_TYPES = ["detached", "semi", "townhouse", "condo", "land", "other"];
const PRICE_BANDS = [
  "under-500k",
  "500k-750k",
  "750k-1m",
  "1m-1.5m",
  "1.5m-2m",
  "over-2m",
  "not-sure",
];
const TIMELINES = ["asap", "1-3-months", "3-6-months", "6-plus-months", "exploring"];

export interface MatchedAgent {
  name: string;
  title: string | null;
  brokerage: string | null;
  slug: string | null;
  avatar_url: string | null;
}

/**
 * Agent-match submit. Captures the request, matches up to 3 public agents
 * for the reveal (service-area match first, newest-public fallback), records
 * which agents were shown, and notifies ops + the consumer. Service-role
 * insert (table is admin-only), honeypot-guarded. Never exposes emails or
 * phone numbers of agents — the public profile card is the contact surface.
 */
export async function submitMatchRequest(
  formData: FormData,
): Promise<{ error?: string; agents?: MatchedAgent[] } | void> {
  // Honeypot — bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return { agents: [] };

  const intent = String(formData.get("intent") ?? "");
  const city = String(formData.get("city") ?? "").trim().slice(0, 120);
  const address = String(formData.get("address") ?? "").trim().slice(0, 240);
  const rawType = String(formData.get("property_type") ?? "");
  const property_type = PROPERTY_TYPES.includes(rawType) ? rawType : null;
  const rawBand = String(formData.get("price_band") ?? "");
  const price_band = PRICE_BANDS.includes(rawBand) ? rawBand : null;
  const rawTimeline = String(formData.get("timeline") ?? "");
  const timeline = TIMELINES.includes(rawTimeline) ? rawTimeline : null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const email = String(formData.get("email") ?? "").trim().slice(0, 320);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const source = String(formData.get("source") ?? "").trim().slice(0, 120);

  if (!INTENTS.includes(intent) || !name || !email) {
    return { error: "Please tell us your name and email so agents can reach you." };
  }

  const admin = createAdminClient();

  // Match: public agents serving this city first, newest public agents as
  // the fallback so the reveal never comes back empty while the network grows.
  interface CardRow {
    profile_id: string;
    first_name: string | null;
    last_name: string | null;
    title: string | null;
    brokerage: string | null;
    slug: string | null;
    avatar_url: string | null;
    service_area: string | null;
  }
  const { data: cardData } = await admin
    .from("public_realtor_cards")
    .select(
      "profile_id, first_name, last_name, title, brokerage, slug, avatar_url, service_area",
    )
    .limit(200);
  const cards = ((cardData ?? []) as CardRow[]).filter((c) => c.slug);
  const cityLc = city.toLowerCase();
  const local = cityLc
    ? cards.filter((c) => (c.service_area ?? "").toLowerCase().includes(cityLc))
    : [];
  const pool = [...local, ...cards.filter((c) => !local.includes(c))];
  const matched = pool.slice(0, 3);

  const { error } = await admin.from("match_requests").insert({
    intent,
    city: city || null,
    address: address || null,
    property_type,
    price_band,
    timeline,
    name,
    email,
    phone: phone || null,
    matched_agent_profile_ids: matched.map((m) => m.profile_id),
    source: source || null,
    status: "new",
  });
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const agents: MatchedAgent[] = matched.map((m) => ({
    name: [m.first_name, m.last_name].filter(Boolean).join(" ") || "LIQWD agent",
    title: m.title,
    brokerage: m.brokerage,
    slug: m.slug,
    avatar_url: m.avatar_url,
  }));

  // Ops nudge — match requests are warm; route them same-day.
  const rows = [
    `<strong>Intent:</strong> ${esc(intent)}`,
    city ? `<strong>City:</strong> ${esc(city)}` : null,
    address ? `<strong>Address:</strong> ${esc(address)}` : null,
    property_type ? `<strong>Type:</strong> ${esc(property_type)}` : null,
    price_band ? `<strong>Price band:</strong> ${esc(price_band)}` : null,
    timeline ? `<strong>Timeline:</strong> ${esc(timeline)}` : null,
    `<strong>Contact:</strong> ${esc(name)} · ${esc(email)}${phone ? ` · ${esc(phone)}` : ""}`,
    agents.length
      ? `<strong>Shown agents:</strong> ${agents.map((a) => esc(a.name)).join(", ")}`
      : "<strong>Shown agents:</strong> none (no public agents matched)",
    source ? `<strong>Source:</strong> ${esc(source)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");
  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: email,
    subject: `Agent match: ${intent}${city ? ` in ${city}` : ""} (${timeline ?? "no timeline"})`,
    html: brandedEmail({
      heading: "New agent-match request",
      body: `Someone asked to be matched with an agent — follow up same-day.<br><br>${rows}`,
      ctaUrl: `${base}/dashboard/admin/matches`,
      ctaLabel: "Open the match queue",
    }),
  });

  // Consumer confirmation — transactional response to their own request.
  void sendEmail({
    to: email,
    subject: "Your LIQWD agent shortlist",
    html: brandedEmail({
      heading: "Here's your agent shortlist",
      body:
        `Hi ${esc(name.split(" ")[0] ?? "there")}, thanks for your request` +
        `${city ? ` in ${esc(city)}` : ""}. ` +
        (agents.length
          ? `Your matched agent${agents.length === 1 ? "" : "s"}: ` +
            agents
              .map((a) =>
                a.slug
                  ? `<a href="${base}/realtors/${esc(a.slug)}">${esc(a.name)}</a>`
                  : esc(a.name),
              )
              .join(", ") +
            ". You can read their reviews and reach out directly from their profiles — or reply to this email and we'll make the introduction."
          : "We're preparing your shortlist and will follow up shortly — or reply to this email and we'll make the introduction directly.") +
        " Our matching is free with no obligation.",
      ctaUrl: agents[0]?.slug ? `${base}/realtors/${agents[0].slug}` : `${base}/projects`,
      ctaLabel: agents.length ? "See your matched agents" : "Browse new homes",
    }),
  });

  return { agents };
}
