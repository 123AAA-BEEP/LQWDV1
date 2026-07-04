import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Market Radar — "what's trending" as a data feed, not a hunch.
 *
 * Pulls the US Census Building Permits Survey metro files (monthly,
 * year-to-date units by structure size) for the latest available month and
 * the same month last year, ranks every metro by 5+ unit (multi-family)
 * permit volume and YoY growth, and flags the metros we already operate in.
 * Multi-family permits are the leading indicator of exactly our inventory:
 * named, multi-unit, pre-construction projects.
 *
 *   ?probe=1   raw head of the Census file (parser tuning)
 *   ?ui=1      readable HTML table
 *   ?email=1   also mail the report to LEADS_NOTIFY_EMAIL
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET (quarterly cron).
 */

const BPS_BASE = "https://www2.census.gov/econ/bps/Metro";

/** Metro-name fragments for markets we already operate in. */
const OUR_METROS = [
  "Miami", "Fort Lauderdale", "West Palm", "Tampa", "Orlando", "Naples",
  "Sarasota", "Jacksonville", "Cape Coral",
  "Nashville",
  "Austin", "Dallas", "Fort Worth", "Houston", "San Antonio",
  "Los Angeles", "San Francisco", "San Jose", "Anaheim",
];

const UA = { "user-agent": "LIQWD-radar/1.0 (+https://liqwd.ca)" };

async function fetchBps(yy: number, mm: number): Promise<string | null> {
  const name = `ma${String(yy).padStart(2, "0")}${String(mm).padStart(2, "0")}y.txt`;
  try {
    const res = await fetch(`${BPS_BASE}/${name}`, {
      headers: UA,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Latest available YTD file, walking back up to 5 months. */
async function latestBps(): Promise<{ text: string; yy: number; mm: number } | null> {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth() + 1; // BPS lags ~6-8 weeks
  for (let i = 0; i < 6; i++) {
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
    const text = await fetchBps(y % 100, m);
    if (text) return { text, yy: y % 100, mm: m };
  }
  return null;
}

interface MetroRow {
  cbsa: string;
  name: string;
  units1: number;
  units5plus: number;
  total: number;
}

/**
 * BPS metro files: two header lines, then CSV rows
 *   Date, CSA, CBSA, Name, 1-unit, 2-units, 3-4 units, 5+ units, …
 * Parsed defensively: a data row is one whose CBSA field is numeric and
 * which carries 4+ numeric unit columns after the name.
 */
function parseBps(text: string): MetroRow[] {
  const out: MetroRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 8) continue;
    const cbsa = parts[2];
    if (!/^\d{4,5}$/.test(cbsa)) continue;
    const name = parts[3];
    if (!name || /name/i.test(name)) continue;
    const nums = parts.slice(4, 8).map((v) => parseInt(v.replace(/\D/g, ""), 10));
    if (nums.some((n) => !Number.isFinite(n))) continue;
    const [u1, u2, u34, u5] = nums;
    out.push({
      cbsa,
      name,
      units1: u1,
      units5plus: u5,
      total: u1 + u2 + u34 + u5,
    });
  }
  return out;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  const cron = process.env.CRON_SECRET;
  const ok =
    (secret && url.searchParams.get("key") === secret) ||
    (cron && req.headers.get("authorization") === `Bearer ${cron}`);
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const current = await latestBps();
  if (!current) {
    return NextResponse.json({ error: "no BPS file reachable" }, { status: 502 });
  }

  if (url.searchParams.get("probe") === "1") {
    return NextResponse.json({
      file: `ma${current.yy}${String(current.mm).padStart(2, "0")}y.txt`,
      head: current.text.split(/\r?\n/).slice(0, 8),
      parsed_sample: parseBps(current.text).slice(0, 5),
    });
  }

  const prior = await fetchBps(current.yy - 1, current.mm);
  const nowRows = parseBps(current.text);
  const priorRows = prior ? parseBps(prior) : [];
  const priorMap = new Map(priorRows.map((r) => [r.cbsa, r]));

  const ranked = nowRows
    .map((r) => {
      const p = priorMap.get(r.cbsa);
      const yoy =
        p && p.units5plus > 100
          ? Math.round(((r.units5plus - p.units5plus) / p.units5plus) * 100)
          : null;
      return {
        metro: r.name,
        multifamily_units_ytd: r.units5plus,
        total_units_ytd: r.total,
        yoy_multifamily_pct: yoy,
        ours: OUR_METROS.some((m) => r.name.includes(m)),
      };
    })
    .sort((a, b) => b.multifamily_units_ytd - a.multifamily_units_ytd);

  const top = ranked.slice(0, 30);
  // Biggest movers among metros with real volume (≥1,500 MF units YTD).
  const movers = ranked
    .filter((r) => r.multifamily_units_ytd >= 1500 && r.yoy_multifamily_pct != null)
    .sort((a, b) => (b.yoy_multifamily_pct ?? 0) - (a.yoy_multifamily_pct ?? 0))
    .slice(0, 15);
  const gaps = top.filter((r) => !r.ours).slice(0, 10);

  const body = {
    ranAt: new Date().toISOString(),
    period: `YTD through ${current.yy + 2000}-${String(current.mm).padStart(2, "0")}`,
    yoy_vs: prior ? "same month prior year" : "unavailable (prior-year file missing)",
    top_30_by_multifamily: top,
    biggest_movers_yoy: movers,
    top_metros_we_are_not_in: gaps,
  };

  if (url.searchParams.get("email") === "1" || req.headers.get("authorization")) {
    const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
    const row = (r: (typeof top)[number]) =>
      `<tr><td>${r.ours ? "✅" : ""}</td><td>${r.metro}</td><td align="right">${r.multifamily_units_ytd.toLocaleString()}</td><td align="right">${r.yoy_multifamily_pct ?? "—"}%</td></tr>`;
    await sendEmail({
      to,
      subject: `Market Radar ${body.period}: top metros by multi-family permits`,
      html: `<p>US Census Building Permits Survey — multi-family (5+ unit) permits, ${body.period}. ✅ = market we're in.</p>
<table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:13px">
<tr><th></th><th align="left">Metro</th><th>MF units YTD</th><th>YoY</th></tr>
${top.slice(0, 20).map(row).join("")}</table>
<p><strong>Top metros we're NOT in:</strong> ${gaps.map((g) => g.metro.split(",")[0]).join(" · ")}</p>`,
    }).catch(() => null);
  }

  if (url.searchParams.get("ui") === "1") {
    const tr = (r: (typeof top)[number]) =>
      `<tr style="${r.ours ? "background:#0d948820" : ""}"><td>${r.ours ? "✅" : ""}</td><td>${r.metro}</td><td align="right">${r.multifamily_units_ytd.toLocaleString()}</td><td align="right">${r.yoy_multifamily_pct ?? "—"}</td></tr>`;
    const html = `<!doctype html><meta charset="utf-8"><title>Market Radar</title>
<body style="font-family:ui-sans-serif,system-ui;padding:32px;background:#0b1220;color:#e2e8f0;max-width:760px;margin:auto">
<h2>Market Radar — ${body.period}</h2>
<p>US metros ranked by multi-family (5+ unit) permits, YTD. Highlighted = our markets.</p>
<table cellpadding="6" style="border-collapse:collapse;width:100%">
<tr style="text-align:left"><th></th><th>Metro</th><th align="right">MF units</th><th align="right">YoY %</th></tr>
${top.map(tr).join("")}</table>
<h3>Biggest YoY movers (≥1,500 MF units)</h3>
<table cellpadding="6" style="border-collapse:collapse;width:100%">
${movers.map(tr).join("")}</table></body>`;
    return new Response(html, { headers: { "content-type": "text/html" } });
  }

  return NextResponse.json(body);
}
