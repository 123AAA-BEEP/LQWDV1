import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { plainEmail } from "@/lib/email";
import {
  complianceFootnote,
  suppressedAmong,
} from "@/lib/email-compliance";
import { OUTREACH_DAILY_CAP, outreachSentLast24h } from "@/lib/outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Lead-triggered recruitment — every real buyer inquiry becomes the proof
 * point in a recruitment blast to the next tranche of that city's agent list.
 *
 * The lead is a carrot, not the product: with ~limited lead volume, what we
 * maximize is VERIFIED SIGNUPS per lead, not lead servicing. So the email is
 * written for the miss case (the reader almost certainly won't get this
 * inquiry) and the CTA is always "claim your projects / free account" — never
 * "come get this lead". Two truthful variants:
 *
 *   unclaimed page — "a buyer inquired on X and no agent owns that page; the
 *     inquiry is sitting unworked. {n} projects in {city} are still open."
 *   claimed page  — "a buyer inquired on X and it routed instantly to the
 *     claiming agent, no referral fee. {n} projects in {city} are still open."
 *
 * Honesty by construction: every send traces to a real project_leads row
 * (≤7 days old), counts are computed live, buyer PII never leaves the
 * building, and we never promise the triggering lead to anyone.
 *
 * Sweep semantics (cron or manual):
 *   - evaluates recent leads with recruit_notified_at IS NULL (skips realtor
 *     self-registrations, spam, cities without recruit coverage)
 *   - per-project cooldown (14d) — a hot project's tenth lead of the week
 *     doesn't re-blast the same city tranche
 *   - per-target rest (7d since last_emailed_at, any campaign) + suppression
 *   - global warm-up throttle: at most DAILY_CAP connector sends per 24h
 *   - targets ranked by sales volume; each event drains the next tranche
 *
 *   ?limit=5    leads evaluated per run (max 10)
 *   ?batch=25   sends per triggering lead (max 50)
 *   ?dry=1      no sends, no state changes: returns what WOULD happen + sample
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 *
 * Sender isolation: same RECRUIT_RESEND_API_KEY / RECRUIT_EMAIL_FROM second
 * Resend account as recruit-wave — never the transactional sender.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
/** Recruits emailed per triggering lead (override with ?batch=, capped 50). */
const DEFAULT_BATCH = 25;
/** Don't re-blast the same project within this window. */
const PROJECT_COOLDOWN_DAYS = 14;
/** Don't email the same target within this window (any campaign). */
const TARGET_COOLDOWN_DAYS = 7;
/** Only leads this fresh can trigger — "just inquired" has to be true. */
const LEAD_MAX_AGE_DAYS = 7;

const CONSENT_CONTEXT =
  "You're receiving this one-time professional invitation because your business contact information is published in connection with your real-estate practice.";

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

interface RecruitTarget {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  notes: string | null;
  volume_last_period: number | null;
}

function inviteEmail(opts: {
  first: string | null;
  projectName: string;
  city: string;
  slug: string;
  email: string;
  claimed: boolean;
  unclaimedCount: number | null;
}): { subject: string; html: string } {
  const pageUrl = `${SITE}/projects/${opts.slug}`;
  const ctaUrl =
    `${SITE}/agents/early-access?utm_source=recruit&utm_medium=email` +
    `&utm_campaign=lead-trigger&utm_content=${encodeURIComponent(opts.slug)}`;
  const name = esc(opts.projectName);
  const city = esc(opts.city);

  // The proof line — both variants are literally true for this lead. Written
  // like a person telling you what happened, not a campaign announcing itself.
  const proof = opts.claimed
    ? `A buyer inquired on ${name} in ${city} this week. It went straight to the ` +
      `one agent who's claimed that page — no referral fee.`
    : `A buyer inquired on ${name} in ${city} this week — and that page has no ` +
      `agent on it, so nobody followed up.`;

  // Miss-case pivot: the reader won't get THIS lead; they can own the next one.
  const openLine =
    opts.unclaimedCount && opts.unclaimedCount > 0
      ? `${opts.unclaimedCount} ${city} project${opts.unclaimedCount === 1 ? " page still has" : " pages still have"} ` +
        `no agent — it's one agent per project, first to claim.`
      : `A number of ${city} project pages still have no agent — it's one agent per project, first to claim.`;

  return {
    subject: opts.claimed
      ? `a buyer just asked about ${opts.projectName}`
      : `a buyer asked about ${opts.projectName} — nobody answered`,
    html: plainEmail({
      body:
        `<p>${opts.first ? `Hi ${esc(opts.first)},` : "Hi,"}</p>` +
        `<p>${proof}</p>` +
        `<p>That's how LIQWD works: claim a pre-con project page (it's free) and its ` +
        `buyer inquiries route to you for as long as you keep the page current. ` +
        `${openLine}</p>` +
        `<p>Here's the page the inquiry came in on: <a href="${pageUrl}" style="color:#0d6efd;">${pageUrl.replace(/^https?:\/\//, "")}</a></p>` +
        `<p>Verifying takes about two minutes with your RECO number: ` +
        `<a href="${ctaUrl}" style="color:#0d6efd;">liqwd.ca/agents</a></p>` +
        `<p>Alex<br>LIQWD &middot; liqwd.ca</p>`,
      footnote: complianceFootnote({
        law: "casl",
        email: opts.email,
        consentContext: CONSENT_CONTEXT,
      }),
    }),
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = url.searchParams.get("dry") === "1";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "5", 10) || 5, 10);
  const batch = Math.min(
    parseInt(url.searchParams.get("batch") ?? String(DEFAULT_BATCH), 10) || DEFAULT_BATCH,
    50,
  );

  const recruitKey = process.env.RECRUIT_RESEND_API_KEY;
  const recruitFrom = process.env.RECRUIT_EMAIL_FROM;
  if (!dry && (!recruitKey || !recruitFrom)) {
    return NextResponse.json(
      {
        error:
          "outreach sender not armed — set RECRUIT_RESEND_API_KEY and RECRUIT_EMAIL_FROM in Vercel. Run with &dry=1 to preview.",
      },
      { status: 412 },
    );
  }

  const admin = createAdminClient();

  // Shared outreach budget (waves + lead-triggered): lead blasts get first
  // claim on the day's volume by running on the tighter cron.
  const sentToday = await outreachSentLast24h(admin);
  let dailyRoom = Math.max(0, OUTREACH_DAILY_CAP - sentToday);
  if (!dry && dailyRoom === 0) {
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      sent: 0,
      note: `outreach daily cap (${OUTREACH_DAILY_CAP}/24h) reached — leads stay queued for the next window`,
    });
  }

  const { data: leadRows } = await admin
    .from("project_leads")
    .select(
      "id, project_id, public_project_page_id, assigned_realtor_profile_id, is_realtor, status, created_at",
    )
    .is("recruit_notified_at", null)
    .gte("created_at", daysAgo(LEAD_MAX_AGE_DAYS))
    .neq("status", "spam")
    .order("created_at", { ascending: true })
    .limit(limit);
  const leads = leadRows ?? [];

  const outcomes: {
    lead_id: string;
    project?: string;
    variant?: "claimed" | "unclaimed";
    outcome: string;
    invited?: number;
  }[] = [];
  let totalSent = 0;
  let aborted = false;
  let sample: { to: string; subject: string; html: string } | undefined;

  // Evaluated = decided; only real decisions advance the watermark. A send
  // failure or the daily cap leaves the lead untouched for the next sweep.
  const markEvaluated = async (leadId: string) => {
    if (dry) return;
    await admin
      .from("project_leads")
      .update({ recruit_notified_at: new Date().toISOString() })
      .eq("id", leadId);
  };

  for (const lead of leads) {
    if (aborted) break;
    if (!dry && dailyRoom === 0) break; // cap hit mid-run — rest stay queued

    // Realtor self-registrations get their own reply flow; a buyer's inquiry
    // is the only honest "a buyer inquired" trigger.
    if (lead.is_realtor) {
      await markEvaluated(lead.id);
      outcomes.push({ lead_id: lead.id, outcome: "skip: realtor self-registration" });
      continue;
    }

    const { data: project } = await admin
      .from("projects")
      .select("id, project_name, city")
      .eq("id", lead.project_id)
      .maybeSingle();
    const { data: page } = await admin
      .from("public_project_pages")
      .select("id, slug, is_active, assigned_realtor_profile_id, assigned_realtor_until")
      .eq("project_id", lead.project_id)
      .maybeSingle();

    if (!project?.city || !page?.slug || !page.is_active) {
      await markEvaluated(lead.id);
      outcomes.push({
        lead_id: lead.id,
        project: project?.project_name ?? undefined,
        outcome: "skip: no active public page / no city on record",
      });
      continue;
    }

    // Claimed vs unclaimed picks the copy variant — both are recruit triggers.
    const stewardLive =
      Boolean(page.assigned_realtor_profile_id) &&
      (!page.assigned_realtor_until ||
        new Date(page.assigned_realtor_until).getTime() > Date.now());
    const claimed = stewardLive || Boolean(lead.assigned_realtor_profile_id);

    // Per-project cooldown — one blast per project per window, however many
    // leads it collects in the meantime.
    const { count: recentBlasts } = await admin
      .from("lead_recruit_sends")
      .select("id", { count: "exact", head: true })
      .eq("project_id", lead.project_id)
      .gte("sent_at", daysAgo(PROJECT_COOLDOWN_DAYS));
    if ((recentBlasts ?? 0) > 0) {
      await markEvaluated(lead.id);
      outcomes.push({
        lead_id: lead.id,
        project: project.project_name,
        outcome: "skip: project blasted within cooldown",
      });
      continue;
    }

    const cityPattern = `%${project.city.replace(/[%_]/g, "")}%`;

    // Live scarcity number for the copy — computed, never invented.
    const { count: unclaimedCount } = await admin
      .from("public_project_pages")
      .select("id, projects!inner(id)", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("projects.record_status", "published")
      .ilike("projects.city", cityPattern)
      .or(
        `assigned_realtor_profile_id.is.null,assigned_realtor_until.lte.${new Date().toISOString()}`,
      );

    // Next tranche of the city's ranked list: top producers first, resting
    // anyone contacted in the last week (wave sends count too).
    const take = dry ? batch : Math.min(batch, dailyRoom);
    const { data: targetRows } = await admin
      .from("recruit_targets")
      .select("id, email, full_name, status, notes, volume_last_period")
      .in("status", ["pending", "invited", "followup_1", "followup_2"])
      .ilike("base_city", cityPattern)
      .or(`last_emailed_at.is.null,last_emailed_at.lt.${daysAgo(TARGET_COOLDOWN_DAYS)}`)
      .order("volume_last_period", { ascending: false, nullsFirst: false })
      .limit(take + 10); // headroom for suppression skips
    const candidates = (targetRows ?? []) as RecruitTarget[];

    const suppressed = await suppressedAmong(admin, candidates.map((t) => t.email));
    const targets = candidates
      .filter((t) => !suppressed.has(t.email.trim().toLowerCase()))
      .slice(0, take);

    if (targets.length === 0) {
      await markEvaluated(lead.id);
      outcomes.push({
        lead_id: lead.id,
        project: project.project_name,
        outcome: `skip: no rested recruit targets for "${project.city}"`,
      });
      continue;
    }

    let invited = 0;
    let sendFailed = false;

    for (const t of targets) {
      const email = t.email.trim().toLowerCase();
      const first = (t.full_name ?? "").trim().split(/\s+/)[0] || null;
      const mail = inviteEmail({
        first,
        projectName: project.project_name,
        city: project.city,
        slug: page.slug,
        email,
        claimed,
        unclaimedCount: unclaimedCount ?? null,
      });

      if (dry) {
        invited++;
        sample ??= { to: email, subject: mail.subject, html: mail.html };
        continue;
      }

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${recruitKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: recruitFrom,
          to: [email],
          subject: mail.subject,
          html: mail.html,
          reply_to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
        }),
      });

      if (res.ok) {
        totalSent++;
        invited++;
        dailyRoom--;
        await admin.from("lead_recruit_sends").insert({
          lead_id: lead.id,
          project_id: lead.project_id,
          target_id: t.id,
          email,
        });
        await admin
          .from("recruit_targets")
          .update({
            status: t.status === "pending" ? "invited" : t.status,
            invited_at: t.status === "pending" ? new Date().toISOString() : undefined,
            last_emailed_at: new Date().toISOString(),
            notes: t.notes ?? "lead-trigger",
          })
          .eq("id", t.id);
      } else {
        const err = (await res.text()).slice(0, 160);
        outcomes.push({
          lead_id: lead.id,
          project: project.project_name,
          outcome: `resend ${res.status}: ${err}`,
        });
        sendFailed = true;
        // Auth/config failures affect every send — stop the whole sweep and
        // leave this lead unevaluated so the next run retries it.
        if (res.status === 401 || res.status === 403) aborted = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    if (!sendFailed) {
      await markEvaluated(lead.id);
      outcomes.push({
        lead_id: lead.id,
        project: project.project_name,
        variant: claimed ? "claimed" : "unclaimed",
        outcome: dry ? `dry-run: would invite ${invited}` : `invited ${invited}`,
        invited,
      });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    dry,
    batch,
    daily_cap: OUTREACH_DAILY_CAP,
    sent_last_24h: sentToday,
    leads_evaluated: leads.length,
    sent: totalSent,
    outcomes,
    sample,
  });
}
