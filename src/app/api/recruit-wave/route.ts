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
 * Recruit wave sender — the throttled outreach machine over recruit_targets.
 *
 * Waves are configured in code (audience filter + template); each run drains
 * a small batch so daily volume stays at warm-up levels. Per target: skip if
 * suppressed or already contacted, send the CASL-compliant invite, advance
 * status pending -> invited.
 *
 *   ?wave=1        which wave (required)
 *   ?limit=10      sends per run (max 25)
 *   ?dry=1         no sends: returns the selection + fully rendered sample
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 *
 * SENDER ISOLATION (deliberate): outreach refuses to run on the main Resend
 * account — auth emails (signup confirmations) live there, and a cold-email
 * complaint spiral suspending that account would break signups. Set
 * RECRUIT_RESEND_API_KEY + RECRUIT_EMAIL_FROM (a SECOND Resend account with
 * its own domain, e.g. liqwdapp.com) in Vercel to arm real sends.
 */

interface WaveConfig {
  /** recruit_targets filter */
  cityLike: string;
  region: string;
  /** Sales-volume band. The sweet spot is the tier BELOW the mega-teams:
   *  they read their own inbox, get no builder VIP treatment, and claiming a
   *  project is transformative rather than incremental. Top producers become
   *  targets later, once the platform has social proof. */
  minVolume?: number;
  maxVolume?: number;
  /** hard ceiling of invites for this wave */
  cap: number;
  /** projectName is a real published project in the wave's city (rotates per
   *  send so subjects stay concrete and non-identical); null if none fit. */
  subject: (projectName: string | null) => string;
  utmCampaign: string;
  /** returns the plain-note body (before compliance footnote); projectName
   *  echoes the subject's project, projectCount is the live published count
   *  in the wave's city, platformCount the live published total. Live merges
   *  so the copy never over-claims ("every") or goes stale. */
  html: (
    firstName: string | null,
    projectName: string | null,
    projectCount: number | null,
    platformCount: number | null,
  ) => { body: string };
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");

// Cold copy rules: sounds like a person typed it. No bold benefit blocks, no
// marketing cadence, no buttons, no em-dashes (the classic AI tell), one link,
// a direct ask. Numbers are live-computed merges, never invented.
const WAVES: Record<string, WaveConfig> = {
  "1": {
    cityLike: "%mississauga%",
    region: "ontario",
    // $2.5M–$12M last-period volume: roughly the 40th–95th percentile of the
    // Mississauga list (~1,500 agents). Solid producers, no assistants
    // filtering their email, no VIP allocations. The hungry middle.
    minVolume: 2_500_000,
    maxVolume: 12_000_000,
    cap: 250,
    // The subject is the scenario and the drip cron fires at 9pm Toronto time
    // so it arrives while it's happening to them. Framed as "your buyer"
    // (clearly rhetorical), never impersonating a real inquiry.
    subject: (project) =>
      project
        ? `Your Buyer: "What's Left At ${project}?"`
        : `Your Buyer: "What's Left In Mississauga?"`,
    utmCampaign: "wave1-mississauga",
    html: (first, project, count, platform) => ({
      body:
        `<p>${first ? `Hi ${first},` : "Hi,"}</p>` +
        `<p>When a buyer texts you at 9pm asking what's left ` +
        `${project ? `at ${project}` : "in Mississauga"}, how long does it take ` +
        `to get them a real answer?</p>` +
        `<p>I built LIQWD so it takes about thirty seconds. ` +
        `${count && count >= 20 ? `${count} active` : "Dozens of"} Mississauga ` +
        `projects in one place` +
        `${platform && platform >= 200 ? ` (${Math.floor(platform / 100) * 100}+ across the platform)` : ""}: ` +
        `pricing, status, incentives, floor plans, and builder portals one ` +
        `click away.</p>` +
        `<p>Sign up free at ` +
        `<a href="${SITE}/agents/early-access?utm_source=recruit&utm_medium=email&utm_campaign=wave1-mississauga" style="color:#0d6efd;">liqwd.ca/agents</a>. ` +
        `Verification takes two minutes with your RECO number, and it's all in ` +
        `your pocket tonight.</p>` +
        `<p>Alex<br>LIQWD</p>` +
        `<p>P.S. Don't see a project you sell? Add it, claim it, and its buyer ` +
        `inquiries route to you.</p>`,
    }),
  },
};

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

interface Target {
  id: string;
  email: string;
  full_name: string | null;
  brokerage: string | null;
  base_city: string | null;
  volume_last_period: number | null;
}

const CONSENT_CONTEXT =
  "You're receiving this one-time professional invitation because your business contact information is published in connection with your real-estate practice.";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const wave = WAVES[url.searchParams.get("wave") ?? ""];
  if (!wave) {
    return NextResponse.json(
      { error: `unknown wave — available: ${Object.keys(WAVES).join(", ")}` },
      { status: 400 },
    );
  }
  const dry = url.searchParams.get("dry") === "1";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "10", 10) || 10, 25);

  const recruitKey = process.env.RECRUIT_RESEND_API_KEY;
  const recruitFrom = process.env.RECRUIT_EMAIL_FROM;
  if (!dry && (!recruitKey || !recruitFrom)) {
    return NextResponse.json(
      {
        error:
          "outreach sender not armed — set RECRUIT_RESEND_API_KEY and RECRUIT_EMAIL_FROM (a SEPARATE Resend account/domain from transactional mail) in Vercel. Run with &dry=1 to preview.",
      },
      { status: 412 },
    );
  }

  const admin = createAdminClient();

  // Shared outreach budget (waves + lead-triggered blasts): the wave is the
  // evergreen filler, so it only spends what the day has left.
  const sentToday = await outreachSentLast24h(admin);
  const dailyRoom = Math.max(0, OUTREACH_DAILY_CAP - sentToday);
  if (!dry && dailyRoom === 0) {
    return NextResponse.json({
      wave: wave.utmCampaign,
      sent: 0,
      sent_last_24h: sentToday,
      note: `outreach daily cap (${OUTREACH_DAILY_CAP}/24h) reached — targets stay pending`,
    });
  }

  // Wave cap: how many have already been contacted under this campaign.
  const { count: alreadySent } = await admin
    .from("recruit_targets")
    .select("id", { count: "exact", head: true })
    .eq("notes", wave.utmCampaign);
  const room = wave.cap - (alreadySent ?? 0);
  if (room <= 0) {
    return NextResponse.json({
      wave: wave.utmCampaign,
      sent: 0,
      note: `wave cap (${wave.cap}) reached`,
    });
  }

  // Best of the wave's volume band first — the export's sales volume is the
  // ranking signal, the band keeps us aimed at agents who need us most.
  let query = admin
    .from("recruit_targets")
    .select("id, email, full_name, brokerage, base_city, volume_last_period")
    .eq("status", "pending")
    .eq("region", wave.region)
    .ilike("base_city", wave.cityLike);
  if (wave.minVolume != null) query = query.gte("volume_last_period", wave.minVolume);
  if (wave.maxVolume != null) query = query.lte("volume_last_period", wave.maxVolume);
  const { data } = await query
    .order("volume_last_period", { ascending: false, nullsFirst: false })
    .limit(Math.min(limit, room, dry ? limit : dailyRoom));
  const targets = (data ?? []) as Target[];

  // Global suppression list — never email anyone on it, any campaign.
  const suppressed = await suppressedAmong(admin, targets.map((t) => t.email));

  // Real published project names in the wave's city, rotated through the
  // subject line. Short, mixed-case names only — a subject reading
  // "what's left at MILLCROFT THE LEGACY RESIDENCES?" stops sounding human.
  const { data: projRows } = await admin
    .from("projects")
    .select("project_name")
    .eq("record_status", "published")
    .ilike("city", wave.cityLike)
    .limit(60);
  const subjectProjects = ((projRows ?? []) as { project_name: string }[])
    .map((r) => r.project_name.trim())
    .filter((n) => n.length <= 26 && /[a-z]/.test(n));

  // Live published counts for the body's inventory claims (city + platform).
  const { count: projectCount } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("record_status", "published")
    .ilike("city", wave.cityLike);
  const { count: platformCount } = await admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("record_status", "published");

  const results: { email: string; name: string | null; outcome: string }[] = [];
  let sent = 0;

  for (const [i, t] of targets.entries()) {
    const email = t.email.trim().toLowerCase();
    if (suppressed.has(email)) {
      await admin
        .from("recruit_targets")
        .update({ status: "suppressed", notes: wave.utmCampaign })
        .eq("id", t.id);
      results.push({ email, name: t.full_name, outcome: "suppressed — skipped" });
      continue;
    }

    const first = (t.full_name ?? "").trim().split(/\s+/)[0] || null;
    const project = subjectProjects.length
      ? subjectProjects[i % subjectProjects.length]
      : null;
    const content = wave.html(first, project, projectCount ?? null, platformCount ?? null);
    const html = plainEmail({
      body: content.body,
      footnote: complianceFootnote({
        law: "casl",
        email,
        consentContext: CONSENT_CONTEXT,
      }),
    });

    if (dry) {
      results.push({ email, name: t.full_name, outcome: "dry-run (no send)" });
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
        subject: wave.subject(
          subjectProjects.length ? subjectProjects[i % subjectProjects.length] : null,
        ),
        html,
        reply_to: process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com",
      }),
    });

    if (res.ok) {
      await admin
        .from("recruit_targets")
        .update({
          status: "invited",
          invited_at: new Date().toISOString(),
          last_emailed_at: new Date().toISOString(),
          notes: wave.utmCampaign,
        })
        .eq("id", t.id);
      sent++;
      results.push({ email, name: t.full_name, outcome: "sent" });
    } else {
      const err = (await res.text()).slice(0, 160);
      results.push({ email, name: t.full_name, outcome: `resend ${res.status}: ${err}` });
      // Auth/config failures affect every send — stop the batch, keep the rest pending.
      if (res.status === 401 || res.status === 403) break;
    }
    // Gentle pacing inside the batch.
    await new Promise((r) => setTimeout(r, 400));
  }

  // A rendered sample so copy review sees EXACTLY what recipients get.
  let sample: { to: string; subject: string; html: string } | undefined;
  if (dry && targets[0]) {
    const t = targets[0];
    const first = (t.full_name ?? "").trim().split(/\s+/)[0] || null;
    const content = wave.html(first, subjectProjects[0] ?? null, projectCount ?? null, platformCount ?? null);
    sample = {
      to: t.email,
      subject: wave.subject(subjectProjects[0] ?? null),
      html: plainEmail({
        body: content.body,
        footnote: complianceFootnote({
          law: "casl",
          email: t.email,
          consentContext: CONSENT_CONTEXT,
        }),
      }),
    };
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    wave: wave.utmCampaign,
    dry,
    selected: targets.length,
    sent,
    cap: wave.cap,
    previously_sent: alreadySent ?? 0,
    daily_cap: OUTREACH_DAILY_CAP,
    sent_last_24h: sentToday,
    results,
    sample,
  });
}
