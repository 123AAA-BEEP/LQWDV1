"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, brandedEmail } from "@/lib/email";
import { runPresenceAudit, type AuditReport } from "@/lib/presence-audit";

export interface AuditResult {
  error?: string;
  report?: AuditReport | null;
  /** True when Places isn't configured (or failed) and a hand-made report is promised. */
  queued?: boolean;
}

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
const OPS = process.env.OPS_NOTIFY_EMAIL ?? process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The free "See what Google thinks of you" request. Runs the deterministic
 * Places check when configured, otherwise queues a hand-made report — and
 * says which, honestly, in both the UI and the email. Every request is
 * stored (service role; admin-readable) so ops can fulfil the queued ones
 * and so a signup can be linked to its audit later.
 */
export async function requestAudit(formData: FormData): Promise<AuditResult> {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  // Honeypot — real browsers leave it empty.
  if (str("website_url")) return { queued: true };

  const name = str("name").slice(0, 120);
  const brokerage = str("brokerage").slice(0, 160);
  const city = str("city").slice(0, 80);
  const email = str("email").slice(0, 200).toLowerCase();
  const consent = formData.get("marketing_consent") === "on";

  if (!name || !brokerage || !city) {
    return { error: "Please give us your name, brokerage, and city." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email so we can send your report." };
  }

  const admin = createAdminClient();

  // Gentle throttle: three runs per address per day.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("presence_audits")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", dayAgo);
  if ((count ?? 0) >= 3) {
    return { error: "You've run this a few times today. Check your inbox for the last report." };
  }

  let report: AuditReport | null = null;
  let status: "requested" | "reported" | "failed" = "requested";
  try {
    report = await runPresenceAudit({ name, brokerage, city });
    if (report) status = "reported";
  } catch (e) {
    console.error("[audit] places check failed", e);
    status = "failed";
  }

  await admin.from("presence_audits").insert({
    name,
    brokerage,
    city,
    email,
    marketing_consent: consent,
    consent_captured_at: consent ? new Date().toISOString() : null,
    status,
    place_id: report?.placeId ?? null,
    report,
  });

  // Ops copy — the queued ones need a human; the reported ones are a warm list.
  await sendEmail({
    to: OPS,
    replyTo: email,
    subject: `${report ? "Presence audit ran" : "Presence audit QUEUED"}: ${name} · ${brokerage} · ${city}`,
    html: brandedEmail({
      heading: report ? `Audit ran — score ${report.score}/100` : "Audit request needs a hand-made report",
      body: [
        `<strong>${esc(name)}</strong> · ${esc(brokerage)} · ${esc(city)}<br>${esc(email)}`,
        report
          ? report.findings.map((f) => `${f.ok ? "✓" : "✗"} ${esc(f.title)}`).join("<br>")
          : "Google Places isn't configured (GOOGLE_PLACES_API_KEY) or the call failed — promise made: report within 24 hours.",
        consent ? "Marketing consent: yes." : "Marketing consent: no — reply to this request only.",
      ].join("<br><br>"),
    }),
  });

  // The requester's copy: the report itself, or an honest ETA.
  if (report) {
    const lines = report.findings
      .map(
        (f) =>
          `<p style="margin:0 0 10px;"><strong>${f.ok ? "✓" : "✗"} ${esc(f.title)}</strong><br>${esc(f.detail)}${f.fix ? `<br><em>Fix:</em> ${esc(f.fix)}` : ""}</p>`,
      )
      .join("");
    await sendEmail({
      to: email,
      replyTo: OPS,
      subject: report.found
        ? `What Google shows for ${name}: ${report.score}/100`
        : `Google can't find a listing for ${name}`,
      html: brandedEmail({
        heading: report.found ? `Your Google presence: ${report.score}/100` : "Google can't find you yet",
        body: `${lines}<p style="margin:12px 0 0;">Checked ${new Date(report.checkedAt).toLocaleDateString("en-CA")} from your public Google listing. Nothing here is an estimate.</p>`,
        ctaUrl: `${SITE_URL}/signup`,
        ctaLabel: "Fix it with a free LIQWD account",
        footnote:
          "You asked for this report at liqwd.ca/audit. We won't email you again unless you said we could.",
      }),
    });
  } else {
    await sendEmail({
      to: email,
      replyTo: OPS,
      subject: "Your free Google presence report is on its way",
      html: brandedEmail({
        heading: "We're checking your presence by hand",
        body: `Thanks, ${esc(name.split(" ")[0] ?? name)}. A real person is looking at what Google shows for you with ${esc(brokerage)} in ${esc(city)}. Expect the report within 24 hours.`,
        ctaUrl: `${SITE_URL}/signup`,
        ctaLabel: "Create a free account meanwhile",
        footnote:
          "You asked for this report at liqwd.ca/audit. We won't email you again unless you said we could.",
      }),
    });
  }

  return { report, queued: !report };
}
