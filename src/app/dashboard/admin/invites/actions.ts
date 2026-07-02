"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertAdmin } from "@/lib/admin";
import { sendEmail, brandedEmail } from "@/lib/email";
import { claimUrlFor } from "@/lib/off-market";

const PAGE = "/dashboard/admin/invites";
/** Max sends per click — the throttle. Click once a day for a slow warm-up. */
const SEND_BATCH = 20;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(name: string | null): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

/** Renders one agent's invite (what you preview is exactly what sends). */
function renderInvite(opts: {
  agent_name: string | null;
  listings: { title: string; claim_token: string }[];
}): { subject: string; body_html: string } {
  const n = opts.listings.length;
  const subject =
    n === 1
      ? `Your listing is queued on LIQWD — claim it free`
      : `Your ${n} listings are queued on LIQWD — claim them free`;

  const items = opts.listings
    .map(
      (l) =>
        `<li style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#475569;">${esc(
          l.title.length > 90 ? l.title.slice(0, 90) + "…" : l.title,
        )}<br><a href="${claimUrlFor(l.claim_token)}" style="color:#0d9488;font-weight:600;">Claim this listing →</a></li>`,
    )
    .join("");

  const body =
    `Hi ${esc(firstName(opts.agent_name))}, I'm Alex, founder of LIQWD (liqwd.ca) — a private ` +
    `deal board for verified Ontario agents. We're seeding it with active commercial ` +
    `Haves &amp; Wants, and ${n === 1 ? "one of yours is" : `${n} of yours are`} queued:` +
    `<br><br><ul style="margin:0;padding-left:18px;">${items}</ul><br>` +
    `<strong>${n === 1 ? "It stays" : "They stay"} offline until you claim ${n === 1 ? "it" : "them"}.</strong> ` +
    `Each link above is yours alone — one click, create your free account, and your listing goes ` +
    `live under your name with your contact details, in front of verified co-broking agents. ` +
    `No fees, no catch: your listing, your leads.<br><br>` +
    `If you'd rather ${n === 1 ? "it" : "they"} not appear at all, reply "remove" and ${n === 1 ? "it's" : "they're"} gone — no questions asked.`;

  const body_html = brandedEmail({
    heading: `Your listing${n === 1 ? "" : "s"} — waiting to go live`,
    body,
    footnote:
      "Alex Karczewski · LIQWD · liqwd.ca — You're receiving this one-time note because you publicly " +
      'listed these properties. Reply "remove" to opt out of any future contact.',
  });

  return { subject, body_html };
}

/**
 * Builds/refreshes one DRAFT per agent (grouped by claim_email) from unclaimed
 * listings that have an email. Never touches rows that are approved, sent, or
 * skipped — regenerating is always safe.
 */
export async function generateInviteDrafts() {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data } = await supabase
    .from("off_market_listings")
    .select("claim_email, realtor_name, brokerage_name, contact_phone, title, claim_token")
    .eq("status", "pending_claim")
    .is("claimed_by_profile_id", null)
    .not("claim_email", "is", null)
    .not("claim_token", "is", null)
    .order("title");

  type Row = {
    claim_email: string;
    realtor_name: string | null;
    brokerage_name: string | null;
    contact_phone: string | null;
    title: string;
    claim_token: string;
  };
  const byEmail = new Map<string, Row[]>();
  for (const r of ((data ?? []) as Row[])) {
    const k = r.claim_email.toLowerCase();
    if (!byEmail.has(k)) byEmail.set(k, []);
    byEmail.get(k)!.push(r);
  }

  // Skip agents already decided (approved/sent/skipped) — drafts only.
  const { data: existing } = await supabase
    .from("off_market_invites")
    .select("claim_email, status");
  const decided = new Set(
    ((existing ?? []) as { claim_email: string; status: string }[])
      .filter((e) => e.status !== "draft")
      .map((e) => e.claim_email.toLowerCase()),
  );

  let written = 0;
  for (const [email, rows] of byEmail) {
    if (decided.has(email)) continue;
    const { subject, body_html } = renderInvite({
      agent_name: rows[0].realtor_name,
      listings: rows.map((r) => ({ title: r.title, claim_token: r.claim_token })),
    });
    const { error } = await supabase.from("off_market_invites").upsert(
      {
        claim_email: email,
        agent_name: rows[0].realtor_name,
        brokerage_name: rows[0].brokerage_name,
        phone: rows[0].contact_phone,
        listing_count: rows.length,
        subject,
        body_html,
        status: "draft",
      },
      { onConflict: "claim_email" },
    );
    if (!error) written += 1;
  }

  revalidatePath(PAGE);
  return { written };
}

/** Approve / skip / reset a single invite. */
export async function setInviteStatus(formData: FormData) {
  const id = String(formData.get("invite_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["approved", "skipped", "draft"].includes(status)) return;

  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("off_market_invites")
    .update({
      status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .neq("status", "sent"); // sent is final

  revalidatePath(PAGE);
}

/** Approve every current draft in one click. */
export async function approveAllDrafts() {
  const supabase = await createClient();
  await assertAdmin(supabase);
  await supabase
    .from("off_market_invites")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("status", "draft");
  revalidatePath(PAGE);
}

/**
 * Sends up to SEND_BATCH approved invites (the throttle: one click = one
 * batch). Replies go to the ops inbox, so "remove" requests land with you.
 */
export async function sendApprovedBatch() {
  const supabase = await createClient();
  await assertAdmin(supabase);

  const { data } = await supabase
    .from("off_market_invites")
    .select("id, claim_email, subject, body_html")
    .eq("status", "approved")
    .order("created_at")
    .limit(SEND_BATCH);
  const batch = (data ?? []) as {
    id: string;
    claim_email: string;
    subject: string;
    body_html: string;
  }[];

  for (const invite of batch) {
    const ok = await sendEmail({
      to: invite.claim_email,
      subject: invite.subject,
      html: invite.body_html,
      replyTo: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
    });
    await supabase
      .from("off_market_invites")
      .update(
        ok
          ? { status: "sent", sent_at: new Date().toISOString(), error: null }
          : { status: "failed", error: "send failed (Resend unconfigured or rejected)" },
      )
      .eq("id", invite.id);
  }

  revalidatePath(PAGE);
}
