"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMicrositeByDomain, getMicrositeProject } from "@/lib/microsites";
import { resolveLeadSteward } from "@/lib/rewards";
import { sendEmail, brandedEmail } from "@/lib/email";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Microsite lead capture — the whole point of the rail. Validates the
 * domain + capture key server-side (a forged form can't inject into another
 * project), applies the same quality bar as the main lead form (phone
 * required, agent question required), stamps `source` with the microsite
 * domain, and routes through the normal steward/pool machinery so the lead
 * appears in admin + agent inboxes instantly.
 */
export async function submitMicrositeLead(
  formData: FormData,
): Promise<{ error?: string } | void> {
  // Honeypot — bots think they succeeded.
  if (String(formData.get("company") ?? "").trim()) return;

  const domain = String(formData.get("domain") ?? "").toLowerCase().slice(0, 253);
  const captureKey = String(formData.get("capture_key") ?? "");
  const lead_name = String(formData.get("lead_name") ?? "").trim().slice(0, 120);
  const lead_email = String(formData.get("lead_email") ?? "").trim().slice(0, 320);
  const lead_phone = String(formData.get("lead_phone") ?? "").trim().slice(0, 40);
  const address = String(formData.get("lead_address") ?? "").trim().slice(0, 200);
  const message = String(formData.get("message") ?? "").trim().slice(0, 2000);
  const isRealtorRaw = String(formData.get("is_realtor") ?? "");

  const config = await getMicrositeByDomain(domain);
  if (!config || config.status !== "live" || config.capture_key !== captureKey) {
    return { error: "This form isn't accepting submissions right now." };
  }
  if (!lead_name || !lead_email) {
    return { error: "Please provide your name and email." };
  }
  if (!lead_phone || lead_phone.replace(/\D/g, "").length < 7) {
    return { error: "Please provide a phone number so we can reach you." };
  }
  if (!["yes", "no"].includes(isRealtorRaw)) {
    return { error: "Please tell us whether you're a real estate agent." };
  }

  const admin = createAdminClient();
  const project = await getMicrositeProject(config.project_id);
  const publicPageId = project?.public_page_id ?? null;

  // Founder policy (for now): every microsite lead is assigned to the admin
  // account, not the steward pool. Falls back to the steward machinery only
  // if no admin profile exists.
  const { data: adminProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const assigneeId =
    adminProfile?.id ??
    (publicPageId ? await resolveLeadSteward(admin, publicPageId) : null);

  const { error } = await admin.from("project_leads").insert({
    project_id: config.project_id,
    public_project_page_id: publicPageId,
    assigned_realtor_profile_id: assigneeId,
    lead_name,
    lead_email,
    lead_phone,
    address: address || null,
    message: message || null,
    is_realtor: isRealtorRaw === "yes",
    status: "new",
    source: config.domain,
  });
  if (error) {
    return { error: "Something went wrong. Please try again." };
  }

  // Toggleable automation: instantly email the lead the project details —
  // a custom link (e.g. a Google Drive package) or the LIQWD listing.
  if (config.auto_send_details) {
    const detailsUrl =
      config.details_url && /^https:\/\/.+/.test(config.details_url)
        ? config.details_url
        : project?.slug
          ? `https://liqwd.ca/projects/${project.slug}`
          : null;
    if (detailsUrl) {
      void sendEmail({
        to: lead_email,
        subject: `${project?.project_name ?? "Your project"}: details inside`,
        html: brandedEmail({
          heading: `Thanks for registering, ${lead_name.split(" ")[0]}`,
          body:
            `You're on the list for <strong>${esc(project?.project_name ?? "the project")}</strong>. ` +
            "Everything available right now is at the link below, and your representative will follow up with pricing and floor plans as they're released.",
          ctaUrl: detailsUrl,
          ctaLabel: "View the details",
          footnote:
            "You're receiving this because you registered on " +
            esc(config.domain) +
            ".",
        }),
      });
    }
  }

  // Ops copy — every microsite lead reaches the team inbox, source-tagged.
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  void sendEmail({
    to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    replyTo: lead_email,
    subject: `Microsite lead (${config.domain}): ${lead_name}`,
    html: brandedEmail({
      heading: "New microsite lead",
      body:
        `<strong>${esc(lead_name)}</strong> · ${esc(lead_email)} · ${esc(lead_phone)}` +
        `${isRealtorRaw === "yes" ? " · <strong>agent — recruit</strong>" : ""}` +
        `<br><strong>Project:</strong> ${esc(project?.project_name ?? config.project_id)}` +
        `<br><strong>Source:</strong> ${esc(config.domain)}` +
        `${address ? `<br><strong>Address:</strong> ${esc(address)}` : ""}` +
        `${adminProfile ? "<br>Assigned to admin (current microsite policy)." : "<br>Unassigned pool."}` +
        `${config.auto_send_details ? "<br>Details email auto-sent to the lead." : ""}` +
        `${message ? `<br><br>"${esc(message)}"` : ""}`,
      ctaUrl: `${base}/dashboard/admin/leads`,
      ctaLabel: "Open the leads queue",
    }),
  });
}
