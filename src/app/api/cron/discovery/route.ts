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

  const needsHuman = outcomes.filter((o) => !o.published);
  if (needsHuman.length > 0) {
    const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
    const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
    await sendEmail({
      to,
      subject: `Discovery: ${needsHuman.length} project(s) need review`,
      html: `<ul>${needsHuman
        .map(
          (o) =>
            `<li><strong>${o.action}</strong> — ${o.notes}${
              o.project_id
                ? ` — <a href="${base}/dashboard/admin/projects/${o.project_id}">open draft</a>`
                : ""
            }</li>`,
        )
        .join("")}</ul><p><a href="${base}/dashboard/admin/discovery">Discovery queue →</a></p>`,
    }).catch(() => null);
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
