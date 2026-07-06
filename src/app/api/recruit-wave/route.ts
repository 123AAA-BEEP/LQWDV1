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
  /** hard ceiling of invites for this wave */
  cap: number;
  subject: string;
  utmCampaign: string;
  /** returns branded HTML body (before compliance footnote) */
  html: (firstName: string | null) => { heading: string; body: string; ctaUrl: string; ctaLabel: string };
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");

const WAVES: Record<string, WaveConfig> = {
  "1": {
    cityLike: "%mississauga%",
    region: "ontario",
    cap: 250,
    subject: "Be first on Mississauga's new-construction deals",
    utmCampaign: "wave1-mississauga",
    html: (first) => ({
      heading: "Your Mississauga edge",
      body:
        `${first ? `Hi ${first},` : "Hi,"}<br><br>` +
        `You sell Mississauga. Three things that put you ahead this week:<br><br>` +
        `<strong>Win the pre-con conversation.</strong> Every active project — 45+ — with ` +
        `pricing, status, and incentives on one page. Answer a buyer in seconds instead of ` +
        `digging through PDFs and VIP portals.<br><br>` +
        `<strong>Know what's coming before anyone's marketing it.</strong> We track development ` +
        `applications and builder pipelines — walk into your next listing appointment knowing ` +
        `what's breaking ground down the street.<br><br>` +
        `<strong>Free buyer inquiries.</strong> Claim a project's public page and the buyer ` +
        `leads it generates come to you. No referral fees. No brokerage change. Nothing to pay ` +
        `— verification takes two minutes with your RECO number.<br><br>` +
        `Mississauga is live now.<br><br>` +
        `— Alex, LIQWD`,
      ctaUrl: `${SITE}/agents/early-access?utm_source=recruit&utm_medium=email&utm_campaign=wave1-mississauga`,
      ctaLabel: "Claim your market",
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

  // Top producers first — the export's sales volume is the ranking signal.
  const { data } = await admin
    .from("recruit_targets")
    .select("id, email, full_name, brokerage, base_city, volume_last_period")
    .eq("status", "pending")
    .eq("region", wave.region)
    .ilike("base_city", wave.cityLike)
    .order("volume_last_period", { ascending: false, nullsFirst: false })
    .limit(Math.min(limit, room));
  const targets = (data ?? []) as Target[];

  // Global suppression list — never email anyone on it, any campaign.
  const suppressed = await suppressedAmong(admin, targets.map((t) => t.email));

  const results: { email: string; name: string | null; outcome: string }[] = [];
  let sent = 0;

  for (const t of targets) {
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
    const content = wave.html(first);
    const html = brandedEmail({
      heading: content.heading,
      body: content.body,
      ctaUrl: content.ctaUrl,
      ctaLabel: content.ctaLabel,
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
        subject: wave.subject,
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
    const content = wave.html(first);
    sample = {
      to: t.email,
      subject: wave.subject,
      html: brandedEmail({
        heading: content.heading,
        body: content.body,
        ctaUrl: content.ctaUrl,
        ctaLabel: content.ctaLabel,
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
    results,
    sample,
  });
}
