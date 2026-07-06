import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { brandedEmail } from "@/lib/email";
import {
  complianceFootnote,
  suppressedAmong,
} from "@/lib/email-compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Lead-triggered recruitment — the connector between consumer demand and the
 * agent outreach list. When a real buyer inquiry lands on a project whose page
 * NO agent has claimed, the top producers who farm that city get an invite
 * anchored to that inquiry. Never fabricated: every email traces back to an
 * actual project_leads row, and buyer PII never leaves the building — the
 * email says "a buyer", not who.
 *
 * Sweep semantics (run by cron or by hand):
 *   - evaluates recent leads with recruit_notified_at IS NULL
 *   - skips: realtor self-identified leads, spam, claimed pages, leads already
 *     routed to an agent, cities with no recruit coverage
 *   - per-project cooldown (14d) — a hot project's tenth lead of the week
 *     doesn't re-blast the same agents
 *   - per-target frequency cap (7d since last_emailed_at) + global suppression
 *   - top PER_LEAD producers by volume, invited via the ISOLATED outreach
 *     sender (RECRUIT_RESEND_API_KEY / RECRUIT_EMAIL_FROM — see recruit-wave)
 *
 *   ?limit=5   leads evaluated per run (max 10)
 *   ?dry=1     no sends, no state changes: returns what WOULD happen + sample
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
/** Invites per triggering lead — small on purpose: scarcity is the pitch. */
const PER_LEAD = 3;
/** Don't re-blast the same project within this window. */
const PROJECT_COOLDOWN_DAYS = 14;
/** Don't email the same target within this window (any campaign). */
const TARGET_COOLDOWN_DAYS = 7;
/** Only leads this fresh can trigger — "just asked" has to be true. */
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
}): { subject: string; html: string } {
  const pageUrl = `${SITE}/projects/${opts.slug}`;
  const ctaUrl =
    `${SITE}/agents/early-access?utm_source=recruit&utm_medium=email` +
    `&utm_campaign=lead-trigger&utm_content=${encodeURIComponent(opts.slug)}`;
  return {
    subject: `A buyer just inquired about ${opts.projectName}`,
    html: brandedEmail({
      heading: "A live buyer inquiry — unclaimed",
      body:
        `${opts.first ? `Hi ${esc(opts.first)},` : "Hi,"}<br><br>` +
        `A buyer inquiry just landed on <strong>${esc(opts.projectName)} in ` +
        `${esc(opts.city)}</strong> — and no agent owns that page yet, so nobody ` +
        `is following up.<br><br>` +
        `Claim the page and its buyer inquiries route to you. No referral fees, ` +
        `nothing to pay — verification takes two minutes with your RECO number. ` +
        `Reply to this email and we'll connect you with this buyer directly.<br><br>` +
        `The live page: <a href="${pageUrl}">${pageUrl.replace(/^https?:\/\//, "")}</a><br><br>` +
        `— Alex, LIQWD`,
      ctaUrl,
      ctaLabel: "Get verified & claim it",
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
    outcome: string;
    invited?: { email: string; name: string | null }[];
  }[] = [];
  let totalSent = 0;
  let aborted = false;
  let sample: { to: string; subject: string; html: string } | undefined;

  // Evaluated = decided; only real decisions advance the watermark. A send
  // failure leaves the lead untouched so the next sweep retries it.
  const markEvaluated = async (leadId: string) => {
    if (dry) return;
    await admin
      .from("project_leads")
      .update({ recruit_notified_at: new Date().toISOString() })
      .eq("id", leadId);
  };

  for (const lead of leads) {
    if (aborted) break;

    // An agent already owns this lead (steward or referral link) — nothing to
    // recruit against. Realtor self-registrations get their own reply flow.
    if (lead.assigned_realtor_profile_id || lead.is_realtor) {
      await markEvaluated(lead.id);
      outcomes.push({ lead_id: lead.id, outcome: "skip: already routed to an agent" });
      continue;
    }

    const { data: project } = await admin
      .from("projects")
      .select("id, project_name, city")
      .eq("id", lead.project_id)
      .maybeSingle();
    const { data: page } = await admin
      .from("public_project_pages")
      .select("id, slug, is_active, assigned_realtor_profile_id")
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
    if (page.assigned_realtor_profile_id) {
      await markEvaluated(lead.id);
      outcomes.push({
        lead_id: lead.id,
        project: project.project_name,
        outcome: "skip: page already claimed",
      });
      continue;
    }

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

    // Top producers who farm this city, resting anyone contacted recently.
    const cityPattern = `%${project.city.replace(/[%_]/g, "")}%`;
    const { data: targetRows } = await admin
      .from("recruit_targets")
      .select("id, email, full_name, status, notes, volume_last_period")
      .in("status", ["pending", "invited", "followup_1", "followup_2"])
      .ilike("base_city", cityPattern)
      .or(`last_emailed_at.is.null,last_emailed_at.lt.${daysAgo(TARGET_COOLDOWN_DAYS)}`)
      .order("volume_last_period", { ascending: false, nullsFirst: false })
      .limit(PER_LEAD * 2); // headroom for suppression skips
    const candidates = (targetRows ?? []) as RecruitTarget[];

    const suppressed = await suppressedAmong(admin, candidates.map((t) => t.email));
    const targets = candidates
      .filter((t) => !suppressed.has(t.email.trim().toLowerCase()))
      .slice(0, PER_LEAD);

    if (targets.length === 0) {
      await markEvaluated(lead.id);
      outcomes.push({
        lead_id: lead.id,
        project: project.project_name,
        outcome: `skip: no rested recruit targets for "${project.city}"`,
      });
      continue;
    }

    const invited: { email: string; name: string | null }[] = [];
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
      });

      if (dry) {
        invited.push({ email, name: t.full_name });
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
        invited.push({ email, name: t.full_name });
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
        outcome: dry ? `dry-run: would invite ${invited.length}` : `invited ${invited.length}`,
        invited,
      });
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    dry,
    leads_evaluated: leads.length,
    sent: totalSent,
    outcomes,
    sample,
  });
}
