import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sweepToronto, type SweepSummary } from "@/lib/discovery/sources/toronto";
import {
  sweepUrbanToronto,
  SKYRISE_INDEX,
} from "@/lib/discovery/sources/urbantoronto";
import { sweepVancouver } from "@/lib/discovery/sources/vancouver";
import {
  sweepAllDirectories,
  seedBuildersFromProjects,
} from "@/lib/discovery/sources/builders";
import {
  sweepAllNewsFeeds,
  sweepUrbanPlanet,
} from "@/lib/discovery/sources/newsfeeds";
import { sweepAllPermits } from "@/lib/discovery/sources/permits";
import {
  sweepAllPortfolios,
  sweepBuilderSites,
} from "@/lib/discovery/sources/portfolios";
import { enrichBuilderWebsites } from "@/lib/discovery/sources/builders";
import { igniteSignal, type IgniteOutcome } from "@/lib/discovery/go";
import { sendEmail } from "@/lib/email";
import type { SignalRow } from "@/lib/discovery/match";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Hands-off discovery cron (scheduled daily in vercel.json — Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`).
 *
 * Every day: sweep the name-signal feeds — UrbanToronto + SkyriseCities
 * (ON/BC/AB) plus the news feeds (The Next Miami, Florida YIMBY, Urbanize LA,
 * UrbanPlanet Nashville) — and ignite anything new.
 * Tuesdays: also refresh every address watchlist (Toronto + Vancouver +
 * Miami-Dade, Nashville, LA, Calgary, Edmonton permits).
 * Wednesdays: also refresh the builder registry (projects seed + every
 * association directory — BILD plus its state/metro HBA equivalents).
 * Query-string-free by design — cron paths stay plain.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const day = new Date().getUTCDay(); // 0=Sun … 2=Tue, 3=Wed
  const sweeps: SweepSummary[] = [];

  sweeps.push(
    await sweepUrbanToronto(admin).catch((e) => fail("urbantoronto", e)),
  );
  sweeps.push(
    await sweepUrbanToronto(admin, {
      indexUrl: SKYRISE_INDEX,
      sourceTag: "skyrisecities",
    }).catch((e) => fail("skyrisecities", e)),
  );
  sweeps.push(...(await sweepAllNewsFeeds(admin)));
  sweeps.push(
    await sweepUrbanPlanet(admin).catch((e) => fail("urbanplanet_nashville", e)),
  );
  if (day === 2) {
    sweeps.push(await sweepToronto(admin).catch((e) => fail("toronto_opendata", e)));
    sweeps.push(
      await sweepVancouver(admin).catch((e) => fail("vancouver_opendata", e)),
    );
    sweeps.push(...(await sweepAllPermits(admin)));
  }
  if (day === 3) {
    sweeps.push(
      await seedBuildersFromProjects(admin).catch((e) => fail("seed_builders", e)),
    );
    // Every association directory (BILD + its equivalent in each market).
    sweeps.push(...(await sweepAllDirectories(admin)));
  }
  if (day === 4) {
    // Thursdays: developer + architect portfolios (the earliest name signal).
    sweeps.push(...(await sweepAllPortfolios(admin)));
  }
  // Every day: find websites for a few registry builders missing one, and
  // rotate through builder sites (least-recently-swept) mining project names.
  sweeps.push(
    await enrichBuilderWebsites(admin, 6).catch((e) => fail("builder_enrich", e)),
  );
  sweeps.push(
    await sweepBuilderSites(admin, 10).catch((e) => fail("builder_sites", e)),
  );

  // Drain up to a handful of new signals per day (each may cost a research pass).
  const { data } = await admin
    .from("discovery_signals")
    .select(
      "id, source, source_url, project_name, builder_name, address_full, city, raw, status, matched_watch_id, project_id",
    )
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(4);
  const outcomes: IgniteOutcome[] = [];
  for (const s of (data ?? []) as SignalRow[]) {
    // Atomic claim — never double-ingest a signal a manual runner grabbed.
    const { data: claimed } = await admin
      .from("discovery_signals")
      .update({ status: "processing" })
      .eq("id", s.id)
      .eq("status", "new")
      .select("id");
    if (!claimed || claimed.length === 0) continue;
    outcomes.push(await igniteSignal(admin, s));
  }

  // Daily DIGEST — the pg_cron drainer runs quiet, so this is the one ops
  // email per day: everything discovery did in the last 24h, in one message.
  try {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recentRows } = await admin
      .from("projects")
      .select("id, project_name, city, record_status, discovery_signals!inner(id)")
      .gte("created_at", since);
    const recent = ((recentRows ?? []) as unknown as {
      id: string;
      project_name: string;
      city: string | null;
      record_status: string;
    }[]);
    const published = recent.filter((r) => r.record_status === "published");
    const drafts = recent.filter((r) => r.record_status === "draft");
    const { count: queued } = await admin
      .from("discovery_signals")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    if (published.length + drafts.length + (queued ?? 0) > 0) {
      const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
      const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
      const li = (r: { id: string; project_name: string; city: string | null }) =>
        `<li><a href="${base}/dashboard/admin/projects/${r.id}">${r.project_name}</a>${r.city ? ` · ${r.city}` : ""}</li>`;
      await sendEmail({
        to,
        subject: `Discovery digest: ${published.length} published, ${drafts.length} drafts to review`,
        html:
          `<p><strong>Last 24h:</strong> ${published.length} published · ${drafts.length} drafts need review · ${queued ?? 0} signals still queued.</p>` +
          (drafts.length
            ? `<p><strong>Drafts to review:</strong></p><ul>${drafts.slice(0, 25).map(li).join("")}${drafts.length > 25 ? `<li>… and ${drafts.length - 25} more</li>` : ""}</ul>`
            : "") +
          (published.length
            ? `<p><strong>Published:</strong></p><ul>${published.slice(0, 15).map(li).join("")}${published.length > 15 ? `<li>… and ${published.length - 15} more</li>` : ""}</ul>`
            : "") +
          `<p><a href="${base}/dashboard/admin/discovery">Discovery queue →</a></p>`,
      }).catch(() => null);
    }
  } catch {
    /* digest is best-effort */
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    day,
    sweeps,
    ignited: outcomes,
  });
}

function fail(source: string, e: unknown): SweepSummary {
  return {
    source,
    scanned: 0,
    added: 0,
    updated: 0,
    notes: [`ERROR: ${e instanceof Error ? e.message : String(e)}`],
  };
}
