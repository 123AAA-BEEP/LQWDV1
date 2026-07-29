"use server";

import { revalidatePath } from "next/cache";
import { requireUserProfile, isApproved } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  complianceFootnote,
  suppressedAmong,
} from "@/lib/email-compliance";
import { redirectWithFlash } from "@/lib/flash";

const PAGE = "/dashboard/newsletter";
const MAX_ARTICLES = 7;
const MAX_RECIPIENTS = 500;

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

interface ArticleRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
}

/**
 * The curated blast: agent picks 1–7 published articles, we send a
 * co-branded email to their CONSENTED contacts. Compliance is enforced
 * server-side and can't be bypassed by the form:
 *   - recipients = consent_email=true AND not unsubscribed AND not on the
 *     global suppression list (checked at send time, every time);
 *   - every email carries the standard HMAC unsubscribe (global, instant)
 *     and the CASL footer with sender identification;
 *   - TRESA: the agent's registered name + brokerage appear in the body;
 *   - rate limit: one send per agent per 24h, capped recipients.
 * Every article link carries the agent's ref code — recipients who inquire
 * become that agent's attributed leads.
 */
export async function sendNewsletter(formData: FormData) {
  const { profile } = await requireUserProfile();
  if (!isApproved(profile)) {
    redirectWithFlash(PAGE, "Newsletter sending needs an active verification.", "error");
  }

  const subject = String(formData.get("subject") ?? "").trim().slice(0, 150);
  const intro = String(formData.get("intro") ?? "").trim().slice(0, 1500);
  const articleIds = formData
    .getAll("article_id")
    .map(String)
    .filter(Boolean)
    .slice(0, MAX_ARTICLES);
  if (!subject) redirectWithFlash(PAGE, "Give it a subject line.", "error");
  if (articleIds.length === 0) {
    redirectWithFlash(PAGE, "Pick at least one article.", "error");
  }

  const supabase = await createClient();

  // Rate limit: one blast per 24h.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: recent } = await supabase
    .from("crm_newsletter_sends")
    .select("id", { count: "exact", head: true })
    .eq("agent_profile_id", profile.id)
    .gte("created_at", dayAgo);
  if ((recent ?? 0) > 0) {
    redirectWithFlash(
      PAGE,
      "You've already sent today — one newsletter per 24 hours keeps open rates (and deliverability) healthy.",
      "error",
    );
  }

  // Only PUBLISHED articles can go out (public view enforces that).
  const { data: articleData } = await supabase
    .from("public_articles_view")
    .select("id, slug, title, excerpt")
    .in("id", articleIds);
  const articles = (articleData as ArticleRow[] | null) ?? [];
  if (articles.length === 0) {
    redirectWithFlash(PAGE, "Those articles aren't published.", "error");
  }

  // Consented recipients only.
  const { data: contactData } = await supabase
    .from("crm_contacts")
    .select("name, email")
    .eq("agent_profile_id", profile.id)
    .eq("archived", false)
    .eq("consent_email", true)
    .is("unsubscribed_at", null)
    .not("email", "is", null)
    .limit(MAX_RECIPIENTS);
  const contacts = ((contactData as { name: string; email: string }[] | null) ?? [])
    .filter((c) => c.email);
  if (contacts.length === 0) {
    redirectWithFlash(
      PAGE,
      "No consented contacts yet — tick email consent on contacts in Clients first.",
      "error",
    );
  }

  // Global suppression check at send time — unsubscribes always win.
  const admin = createAdminClient();
  const suppressed = await suppressedAmong(
    admin,
    contacts.map((c) => c.email),
  );
  const recipients = contacts.filter(
    (c) => !suppressed.has(c.email.toLowerCase()),
  );
  const skipped = contacts.length - recipients.length;
  if (recipients.length === 0) {
    redirectWithFlash(
      PAGE,
      "All consented contacts have unsubscribed from LIQWD mailings.",
      "error",
    );
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
  const agentName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your agent";
  const brokerage = profile.brokerage_name ?? "";
  const ref = profile.referral_code ?? "";

  const articleHtml = articles
    .map((a) => {
      const url = `${base}/insights/${a.slug}?${ref ? `ref=${encodeURIComponent(ref)}&` : ""}utm_source=agent-newsletter&utm_medium=email&utm_campaign=curated`;
      return (
        `<div style="margin:0 0 18px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;">` +
        `<a href="${url}" style="font-size:16px;font-weight:600;color:#0f172a;text-decoration:none;">${esc(a.title)}</a>` +
        (a.excerpt
          ? `<p style="margin:6px 0 0;font-size:14px;color:#475569;line-height:1.5;">${esc(a.excerpt)}</p>`
          : "") +
        `<p style="margin:8px 0 0;"><a href="${url}" style="font-size:13px;color:#0d9488;font-weight:600;text-decoration:none;">Read more →</a></p>` +
        `</div>`
      );
    })
    .join("");

  // Send sequentially — small consented lists, and gentle pacing is kinder
  // to the sending domain than a burst.
  let sent = 0;
  for (const r of recipients) {
    const footer = complianceFootnote({
      law: "casl",
      email: r.email,
      consentContext: `You're receiving this because you're a client contact of ${esc(agentName)}${brokerage ? ` (${esc(brokerage)})` : ""}, who curates it via LIQWD.`,
    });
    const html =
      `<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">` +
      `<p style="font-size:20px;font-weight:700;letter-spacing:-0.01em;margin:0 0 4px;">LIQWD<span style="color:#14b8a6">.</span></p>` +
      `<p style="margin:0 0 16px;font-size:13px;color:#64748b;">Curated for you by ${esc(agentName)}${brokerage ? `, ${esc(brokerage)}` : ""}</p>` +
      (intro
        ? `<p style="margin:0 0 18px;font-size:15px;color:#0f172a;line-height:1.6;">${esc(intro)}</p>`
        : "") +
      articleHtml +
      `<p style="margin:18px 0 0;font-size:14px;color:#475569;">Questions about any of these? Just reply — it comes straight to me.<br>— ${esc(agentName)}</p>` +
      `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0 12px;">` +
      `<p style="font-size:11px;color:#94a3b8;line-height:1.6;">${footer}</p>` +
      `</div>`;
    const ok = await sendEmail({
      to: r.email,
      replyTo: profile.email ?? undefined,
      subject,
      html,
    });
    if (ok) sent += 1;
  }

  await supabase.from("crm_newsletter_sends").insert({
    agent_profile_id: profile.id,
    subject,
    intro: intro || null,
    article_ids: articles.map((a) => a.id),
    recipient_count: sent,
    skipped_count: skipped + (recipients.length - sent),
  });

  revalidatePath(PAGE);
  redirectWithFlash(
    PAGE,
    `Sent to ${sent} contact${sent === 1 ? "" : "s"}${skipped ? ` (${skipped} skipped — unsubscribed)` : ""}. Replies go straight to your inbox.`,
  );
}
