"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLeadSteward } from "@/lib/rewards";
import { sendEmail, brandedEmail } from "@/lib/email";

/**
 * Public lead capture. Runs server-side with the service-role client so lead
 * routing is trusted (not client-supplied):
 *
 *   - If the buyer arrived via a realtor's direct referral link
 *     (`/projects/<slug>?ref=<referral_code>`) and that code maps to an APPROVED
 *     realtor, the lead is attributed to and routed to that realtor — the link
 *     sharer wins over the page's default steward (`referred_by_profile_id`).
 *   - Otherwise, if the project's public page has an active lead steward — a
 *     realtor whose submission/update was approved and whose stewardship hasn't
 *     expired or been bumped — the lead is assigned to them.
 *   - Otherwise it falls to the admin pool.
 *
 * No private data is exposed.
 */
export async function submitLead(
  formData: FormData,
): Promise<{ error?: string } | void> {
  const project_id = String(formData.get("project_id") ?? "");
  const public_page_id = String(formData.get("public_page_id") ?? "");
  const lead_name = String(formData.get("lead_name") ?? "").trim();
  const lead_email = String(formData.get("lead_email") ?? "").trim();
  const lead_phone = String(formData.get("lead_phone") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  // Referral codes are uppercase alphanumerics; normalise so a pasted/lowercased
  // link still attributes correctly.
  const ref = String(formData.get("ref") ?? "")
    .trim()
    .toUpperCase();

  if (!project_id || !lead_name || !lead_email) {
    return { error: "Please provide your name and email." };
  }

  const admin = createAdminClient();

  // Resolve the referral code to an approved realtor (the link sharer). Only
  // approved realtors can receive leads, so an unknown/unapproved code is
  // ignored and we fall back to normal steward routing.
  let referredById: string | null = null;
  if (ref) {
    const { data: refProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("referral_code", ref)
      .eq("role", "realtor")
      .eq("verification_status", "approved")
      .maybeSingle();
    referredById = (refProfile?.id as string | undefined) ?? null;
  }

  const stewardId = public_page_id
    ? await resolveLeadSteward(admin, public_page_id)
    : null;

  // Link sharer wins: a valid referrer takes the lead over the page steward.
  const assignedRealtorId = referredById ?? stewardId;

  const { error } = await admin.from("project_leads").insert({
    project_id,
    public_project_page_id: public_page_id || null,
    assigned_realtor_profile_id: assignedRealtorId,
    referred_by_profile_id: referredById,
    lead_name,
    lead_email,
    lead_phone: lead_phone || null,
    message: message || null,
    status: "new",
  });

  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  // LIQWD owns every lead. Ops always gets a copy — regardless of whether an
  // agent is assigned to action it — so nothing routes away from our database.
  await sendLeadOpsCopyEmail(admin, {
    project_id,
    lead_name,
    lead_email,
    lead_phone,
    message,
    assignedRealtorId,
    referredById,
  });

  // Alert the assigned realtor so they can follow up fast (no-op until Resend
  // is configured; never throws — must not affect the buyer's submission).
  if (assignedRealtorId) {
    await sendLeadAlertEmail(admin, {
      realtorId: assignedRealtorId,
      project_id,
      lead_name,
      lead_email,
      lead_phone,
      message,
    });
  }
}

/**
 * Sends LIQWD ops a copy of EVERY lead (to LEADS_NOTIFY_EMAIL, default
 * leads@getliqwd.com), noting who — if anyone — is set to action it. This is
 * the ownership guarantee: assigned or not, every registered lead reaches us.
 * Fire-and-forget; never throws.
 */
async function sendLeadOpsCopyEmail(
  admin: ReturnType<typeof createAdminClient>,
  opts: {
    project_id: string;
    lead_name: string;
    lead_email: string;
    lead_phone: string;
    message: string;
    assignedRealtorId: string | null;
    referredById: string | null;
  },
) {
  const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";

  const { data: project } = await admin
    .from("projects")
    .select("project_name")
    .eq("id", opts.project_id)
    .maybeSingle();
  const projectName = (project?.project_name as string | undefined) ?? "a project";

  // Who's actioning it (the agent still acts; we just keep the copy).
  let routedTo = "Admin pool — unassigned (LIQWD to follow up).";
  if (opts.assignedRealtorId) {
    const { data: agent } = await admin
      .from("profiles")
      .select("first_name, last_name, email")
      .eq("id", opts.assignedRealtorId)
      .maybeSingle();
    const name =
      [agent?.first_name, agent?.last_name].filter(Boolean).join(" ") ||
      (agent?.email as string | undefined) ||
      "assigned agent";
    const via = opts.referredById ? "via referral link" : "page steward";
    routedTo =
      `${esc(name)} (${via}) is actioning this lead` +
      (agent?.email ? ` — ${esc(agent.email as string)}` : "") +
      ". LIQWD retains the copy.";
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const details = [
    `<strong>Project:</strong> ${esc(projectName)}`,
    `<strong>Name:</strong> ${esc(opts.lead_name)}`,
    `<strong>Email:</strong> ${esc(opts.lead_email)}`,
    opts.lead_phone ? `<strong>Phone:</strong> ${esc(opts.lead_phone)}` : null,
    opts.message ? `<strong>Message:</strong> ${esc(opts.message)}` : null,
    `<strong>Routing:</strong> ${routedTo}`,
  ]
    .filter(Boolean)
    .join("<br>");

  await sendEmail({
    to,
    replyTo: opts.lead_email,
    subject: `New lead (LIQWD copy): ${projectName}`,
    html: brandedEmail({
      heading: `New lead on ${esc(projectName)}`,
      body:
        "A buyer registered on a public project page. This copy is for LIQWD's " +
        `records — every lead is ours.<br><br>${details}`,
      ctaUrl: `${base}/dashboard/admin/leads`,
      ctaLabel: "Open all leads",
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

/**
 * Emails the realtor a "new buyer inquiry" alert with the buyer's details and a
 * deep link to the project. reply_to is the buyer so the agent can respond
 * directly. Buyer-supplied fields are HTML-escaped. Fire-and-forget.
 */
async function sendLeadAlertEmail(
  admin: ReturnType<typeof createAdminClient>,
  opts: {
    realtorId: string;
    project_id: string;
    lead_name: string;
    lead_email: string;
    lead_phone: string;
    message: string;
  },
) {
  const { data: realtor } = await admin
    .from("profiles")
    .select("email, first_name")
    .eq("id", opts.realtorId)
    .maybeSingle();
  const email = realtor?.email as string | undefined;
  if (!email) return;

  const { data: project } = await admin
    .from("projects")
    .select("project_name, slug")
    .eq("id", opts.project_id)
    .maybeSingle();
  const projectName = (project?.project_name as string | undefined) ?? "your project";
  const slug = project?.slug as string | undefined;
  const firstName =
    (realtor?.first_name as string | undefined)?.trim() || "there";
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const ctaUrl = slug
    ? `${base}/dashboard/projects/${slug}`
    : `${base}/dashboard/lead-pages`;

  const details = [
    `<strong>Name:</strong> ${esc(opts.lead_name)}`,
    `<strong>Email:</strong> ${esc(opts.lead_email)}`,
    opts.lead_phone ? `<strong>Phone:</strong> ${esc(opts.lead_phone)}` : null,
    opts.message ? `<strong>Message:</strong> ${esc(opts.message)}` : null,
  ]
    .filter(Boolean)
    .join("<br>");

  await sendEmail({
    to: email,
    replyTo: opts.lead_email,
    subject: `New buyer inquiry: ${projectName}`,
    html: brandedEmail({
      heading: `New buyer inquiry on ${esc(projectName)}`,
      body:
        `Hi ${esc(firstName)}, a buyer just submitted an inquiry on your ` +
        `${esc(projectName)} page — it's yours, with no referral fee. Reach ` +
        `out soon; early follow-ups convert best.<br><br>${details}`,
      ctaUrl,
      ctaLabel: "Open the project",
    }),
  });
}
