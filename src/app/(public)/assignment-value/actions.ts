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

const UNIT_TYPES = ["condo", "townhouse", "detached", "other"];
const STAGES = ["pre-occupancy", "interim-occupancy", "closing-soon", "not-sure"];
const APS = ["yes", "no", "not-sure"];

export interface MatchedProject {
  name: string;
  slug: string | null;
  city: string | null;
}

/**
 * Assignment-valuation capture. Honest model, same as /home-value: no fake
 * instant number — assignment pricing depends on the APS, builder consent
 * terms, and closing timeline, so the promise is an assessment from an agent
 * who actually works assignments. Softly matches the typed project against
 * our tracked inventory for the success-state context (never blocks
 * capture). Service-role insert, honeypot-guarded, ops + consumer emails.
 */
export async function submitAssignmentValuation(
  formData: FormData,
): Promise<{ error?: string; project?: MatchedProject | null } | void> {
  // Honeypot — bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return { project: null };

  const project_name = String(formData.get("project_name") ?? "")
    .trim()
    .slice(0, 200);
  const city = String(formData.get("city") ?? "").trim().slice(0, 120);
  const priceRaw = String(formData.get("purchase_price") ?? "").replace(
    /[^0-9.]/g,
    "",
  );
  const purchase_price = priceRaw ? Number(priceRaw) : null;
  const purchase_year = String(formData.get("purchase_year") ?? "")
    .trim()
    .slice(0, 10);
  const rawUnit = String(formData.get("unit_type") ?? "");
  const unit_type = UNIT_TYPES.includes(rawUnit) ? rawUnit : null;
  const beds = String(formData.get("beds") ?? "").trim().slice(0, 20);
  const rawStage = String(formData.get("stage") ?? "");
  const stage = STAGES.includes(rawStage) ? rawStage : null;
  const rawAps = String(formData.get("aps_assignment_clause") ?? "");
  const aps_assignment_clause = APS.includes(rawAps) ? rawAps : null;
  const details = String(formData.get("details") ?? "").trim().slice(0, 2000);
  const owner_name = String(formData.get("owner_name") ?? "").trim().slice(0, 120);
  const owner_email = String(formData.get("owner_email") ?? "").trim().slice(0, 320);
  const owner_phone = String(formData.get("owner_phone") ?? "").trim().slice(0, 40);
  const source = String(formData.get("source") ?? "").trim().slice(0, 120);

  if (!project_name || !owner_name || !owner_email) {
    return {
      error: "Please tell us the project name, your name, and your email.",
    };
  }

  const admin = createAdminClient();

  // Soft project match against tracked inventory — context, never a gate.
  let matched: (MatchedProject & { project_id: string }) | null = null;
  const { data: projData } = await admin
    .from("public_projects_view")
    .select("project_id, project_name, slug, city")
    .ilike("project_name", `%${project_name.replace(/[%_]/g, "")}%`)
    .limit(1);
  const hit = (projData as
    | { project_id: string; project_name: string; slug: string | null; city: string | null }[]
    | null)?.[0];
  if (hit) {
    matched = {
      project_id: hit.project_id,
      name: hit.project_name,
      slug: hit.slug,
      city: hit.city,
    };
  }

  const { error } = await admin.from("assignment_valuation_requests").insert({
    project_name,
    city: city || null,
    matched_project_id: matched?.project_id ?? null,
    purchase_price:
      purchase_price != null && Number.isFinite(purchase_price)
        ? purchase_price
        : null,
    purchase_year: purchase_year || null,
    unit_type,
    beds: beds || null,
    stage,
    aps_assignment_clause,
    details: details || null,
    owner_name,
    owner_email,
    owner_phone: owner_phone || null,
    source: source || null,
    status: "new",
  });
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";

  // Ops nudge — assignment sellers are often on a clock (closing dates).
  const rows = [
    `<strong>Project:</strong> ${esc(project_name)}${city ? ` (${esc(city)})` : ""}`,
    matched
      ? `<strong>Matched inventory:</strong> ${esc(matched.name)}${matched.slug ? ` — ${base}/projects/${esc(matched.slug)}` : ""}`
      : "<strong>Matched inventory:</strong> no match",
    purchase_price
      ? `<strong>Paid:</strong> $${purchase_price.toLocaleString("en-CA")}${purchase_year ? ` (${esc(purchase_year)})` : ""}`
      : purchase_year
        ? `<strong>Purchased:</strong> ${esc(purchase_year)}`
        : null,
    unit_type ? `<strong>Unit:</strong> ${esc(unit_type)}${beds ? ` · ${esc(beds)} bed` : ""}` : null,
    stage ? `<strong>Stage:</strong> ${esc(stage)}` : null,
    aps_assignment_clause
      ? `<strong>APS allows assignment:</strong> ${esc(aps_assignment_clause)}`
      : null,
    `<strong>Owner:</strong> ${esc(owner_name)} · ${esc(owner_email)}${owner_phone ? ` · ${esc(owner_phone)}` : ""}`,
    details ? `<strong>Notes:</strong> ${esc(details)}` : null,
    source ? `<strong>Source:</strong> ${esc(source)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");
  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: owner_email,
    subject: `Assignment valuation: ${project_name}${city ? ` (${city})` : ""}${stage ? ` — ${stage}` : ""}`,
    html: brandedEmail({
      heading: "New assignment-valuation lead",
      body:
        "A pre-construction buyer wants to know what their assignment is " +
        `worth. These often have closing-date pressure — route to an ` +
        `assignment-savvy agent fast.<br><br>${rows}`,
      ctaUrl: `${base}/dashboard/admin/assignment-values`,
      ctaLabel: "Open the queue",
    }),
  });

  // Consumer confirmation — transactional.
  void sendEmail({
    to: owner_email,
    subject: "Your assignment assessment is being prepared",
    html: brandedEmail({
      heading: "We're on it",
      body:
        `Hi ${esc(owner_name.split(" ")[0] ?? "there")}, thanks — an agent who ` +
        `works pre-construction assignments will review ${esc(project_name)} ` +
        `and get back to you with a free, no-obligation assessment, usually ` +
        `within one business day. Assignment sales have moving parts (builder ` +
        `consent, your agreement's assignment terms, closing timing), so a ` +
        `human look beats any instant estimate. Reply to this email any time ` +
        `to add details.`,
      ctaUrl: matched?.slug ? `${base}/projects/${matched.slug}` : `${base}/projects`,
      ctaLabel: matched?.slug ? `See ${matched.name} on LIQWD` : "Browse projects",
    }),
  });

  return { project: matched ? { name: matched.name, slug: matched.slug, city: matched.city } : null };
}
