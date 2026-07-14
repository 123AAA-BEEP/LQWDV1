import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, brandedEmail } from "@/lib/email";
import { suppressedAmong } from "@/lib/email-compliance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Weekly link-performance digest — the retention channel we own. Every agent
 * whose links did ANYTHING in the last 7 days (views or leads) gets one email:
 * "your links got 12 views — The Summit is your hottest". Agents with zero
 * activity get nothing (a weekly zero is a churn reminder, not retention).
 *
 * Relationship email to members on the MAIN transactional sender (not the
 * cold-outreach account); global suppressions still honoured.
 *
 *   ?limit=50   max digests per run
 *   ?dry=1      compute + return the digest list, send nothing
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET. Cron: Mondays 9am ET.
 */

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = url.searchParams.get("dry") === "1";
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
    100,
  );

  const admin = createAdminClient();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [{ data: visitRows }, { data: leadRows }] = await Promise.all([
    admin
      .from("link_visits")
      .select("profile_id, project_id")
      .gte("created_at", since),
    admin
      .from("project_leads")
      .select("assigned_realtor_profile_id")
      .gte("created_at", since)
      .not("assigned_realtor_profile_id", "is", null),
  ]);

  // Aggregate per agent: total views, views per project, new leads.
  const stats = new Map<
    string,
    { views: number; byProject: Map<string, number>; leads: number }
  >();
  const ensure = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = { views: 0, byProject: new Map(), leads: 0 };
      stats.set(id, s);
    }
    return s;
  };
  for (const v of (visitRows ?? []) as { profile_id: string; project_id: string | null }[]) {
    const s = ensure(v.profile_id);
    s.views += 1;
    if (v.project_id) {
      s.byProject.set(v.project_id, (s.byProject.get(v.project_id) ?? 0) + 1);
    }
  }
  for (const l of (leadRows ?? []) as { assigned_realtor_profile_id: string }[]) {
    ensure(l.assigned_realtor_profile_id).leads += 1;
  }

  if (stats.size === 0) {
    return NextResponse.json({ ranAt: new Date().toISOString(), sent: 0, note: "no activity this week" });
  }

  // Resolve hottest-project names in one query.
  const hotIds = new Set<string>();
  for (const s of stats.values()) {
    const top = [...s.byProject.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) hotIds.add(top[0]);
  }
  const projectNames = new Map<string, string>();
  if (hotIds.size > 0) {
    const { data } = await admin
      .from("projects")
      .select("id, project_name")
      .in("id", [...hotIds]);
    for (const p of (data ?? []) as { id: string; project_name: string }[]) {
      projectNames.set(p.id, p.project_name);
    }
  }

  // Recipients.
  const ids = [...stats.keys()].slice(0, limit);
  const { data: profs } = await admin
    .from("profiles")
    .select("id, first_name, email")
    .in("id", ids);
  const profiles = (profs ?? []) as { id: string; first_name: string | null; email: string | null }[];
  const suppressed = await suppressedAmong(
    admin,
    profiles.map((p) => p.email ?? "").filter(Boolean),
  );

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca";
  const results: { email: string; views: number; leads: number; outcome: string }[] = [];
  let sent = 0;

  for (const p of profiles) {
    const s = stats.get(p.id)!;
    const email = (p.email ?? "").trim().toLowerCase();
    if (!email || suppressed.has(email)) {
      results.push({ email, views: s.views, leads: s.leads, outcome: "skipped" });
      continue;
    }
    const top = [...s.byProject.entries()].sort((a, b) => b[1] - a[1])[0];
    const hottest = top ? projectNames.get(top[0]) : null;

    const lines = [
      `<strong>${s.views}</strong> view${s.views === 1 ? "" : "s"} on your shared links`,
      s.leads > 0
        ? `<strong>${s.leads}</strong> new lead${s.leads === 1 ? "" : "s"} attributed to you`
        : null,
      hottest ? `Your hottest page: <strong>${escHtml(hottest)}</strong>` : null,
    ].filter(Boolean);

    if (dry) {
      results.push({ email, views: s.views, leads: s.leads, outcome: "dry-run" });
      continue;
    }

    await sendEmail({
      to: email,
      subject:
        s.leads > 0
          ? `Your links this week: ${s.views} views, ${s.leads} lead${s.leads === 1 ? "" : "s"}`
          : `Your links this week: ${s.views} view${s.views === 1 ? "" : "s"}`,
      html: brandedEmail({
        heading: `${p.first_name ? `${escHtml(p.first_name)}, your` : "Your"} week on LIQWD`,
        body:
          `Here's what your shared links did over the last 7 days:<br><br>` +
          lines.map((l) => `• ${l}`).join("<br>") +
          `<br><br>Keep the loop going — share a project or shortlist link ` +
          `with a buyer today and it's attributed to you.`,
        ctaUrl: `${base}/dashboard/lead-pages`,
        ctaLabel: "See your Lead Pages",
        footnote:
          "You're receiving this because your LIQWD share links had activity this week. " +
          "Reply \"stop digest\" and we'll turn it off for you.",
      }),
    });
    sent++;
    results.push({ email, views: s.views, leads: s.leads, outcome: "sent" });
    await new Promise((r) => setTimeout(r, 300));
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    activeAgents: stats.size,
    sent,
    dry,
    results,
  });
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
