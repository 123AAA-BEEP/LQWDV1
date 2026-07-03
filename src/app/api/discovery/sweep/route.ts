import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import {
  sweepToronto,
  probeToronto,
  type SweepSummary,
} from "@/lib/discovery/sources/toronto";
import {
  sweepUrbanToronto,
  probeUrbanToronto,
  SKYRISE_INDEX,
} from "@/lib/discovery/sources/urbantoronto";
import {
  sweepVancouver,
  probeVancouver,
} from "@/lib/discovery/sources/vancouver";
import {
  sweepBild,
  sweepAllDirectories,
  probeBild,
  seedBuildersFromProjects,
  BUILDER_DIRECTORIES,
} from "@/lib/discovery/sources/builders";
import {
  NEWS_FEEDS,
  sweepNewsFeed,
  sweepAllNewsFeeds,
  probeNewsFeed,
  sweepUrbanPlanet,
  probeUrbanPlanet,
} from "@/lib/discovery/sources/newsfeeds";
import {
  permitSource,
  sweepPermits,
  sweepAllPermits,
  probePermits,
} from "@/lib/discovery/sources/permits";
import { igniteSignal, type IgniteOutcome } from "@/lib/discovery/go";
import type { SignalRow } from "@/lib/discovery/match";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Discovery engine runner.
 *   ?source=…            which feed to sweep:
 *     urbantoronto | skyrisecities | toronto | vancouver      (ON/BC/AB)
 *     bild | seed-builders                                    (builder registry)
 *     thenextmiami | floridayimby | urbanizela | urbanplanet  (news signals)
 *     newsfeeds                                               (all news feeds)
 *     miamidade | nashville | lapermits | calgary | edmonton  (permit watches)
 *     permits                                                 (all permit feeds)
 *     all                                                     (daily set)
 *   ?probe=1[&url=...]   fetch + return the raw source shape (parser tuning)
 *   ?ignite=0            sweep only, skip publishing new signals
 *   ?ui=1                self-refreshing HTML runner for manual use
 * Auth: ?key=INBOUND_EMAIL_SECRET (manual/admin) or Bearer CRON_SECRET (cron).
 */
function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

async function igniteNewSignals(
  admin: ReturnType<typeof createAdminClient>,
  cap: number,
): Promise<IgniteOutcome[]> {
  const { data } = await admin
    .from("discovery_signals")
    .select(
      "id, source, source_url, project_name, builder_name, address_full, city, raw, status, matched_watch_id, project_id",
    )
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(cap);
  const outcomes: IgniteOutcome[] = [];
  for (const s of (data ?? []) as SignalRow[]) {
    // Atomic claim: concurrent runners (cron + a manual tab) must never
    // double-ingest the same signal — first to flip new→processing wins.
    const { data: claimed } = await admin
      .from("discovery_signals")
      .update({ status: "processing" })
      .eq("id", s.id)
      .eq("status", "new")
      .select("id");
    if (!claimed || claimed.length === 0) continue;
    outcomes.push(await igniteSignal(admin, s));
  }
  return outcomes;
}

/** Ops ping when a discovery lands as a draft/error and needs a human. */
async function pingOps(outcomes: IgniteOutcome[]) {
  const needsHuman = outcomes.filter((o) => !o.published);
  if (needsHuman.length === 0) return;
  const to = process.env.LEADS_NOTIFY_EMAIL ?? "leads@getliqwd.com";
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
  const rows = needsHuman
    .map(
      (o) =>
        `<li><strong>${o.action}</strong> — ${o.notes}${
          o.project_id
            ? ` — <a href="${base}/dashboard/admin/projects/${o.project_id}">open draft</a>`
            : ""
        }</li>`,
    )
    .join("");
  await sendEmail({
    to,
    subject: `Discovery: ${needsHuman.length} new project(s) need review`,
    html: `<p>The discovery sweep found projects it couldn't auto-publish:</p><ul>${rows}</ul><p><a href="${base}/dashboard/admin/discovery">Open the Discovery queue →</a></p>`,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const source = url.searchParams.get("source") ?? "all";
  const probe = url.searchParams.get("probe") === "1";
  const probeUrl = url.searchParams.get("url") ?? undefined;
  const ignite = url.searchParams.get("ignite") !== "0";
  const ui = url.searchParams.get("ui") === "1";

  try {
    if (probe) {
      const out =
        source === "toronto"
          ? await probeToronto()
          : source === "vancouver"
            ? await probeVancouver()
            : source === "bild"
              ? await probeBild(probeUrl)
              : source === "skyrisecities"
                ? await probeUrbanToronto(probeUrl ?? SKYRISE_INDEX)
                : source === "urbanplanet"
                  ? await probeUrbanPlanet(probeUrl)
                  : NEWS_FEEDS.some((f) => f.tag === source)
                    ? await probeNewsFeed(source, probeUrl)
                    : permitSource(source)
                      ? await probePermits(source)
                      : await probeUrbanToronto(probeUrl);
      return NextResponse.json({ probe: source, result: out });
    }

    const admin = createAdminClient();
    const sweeps: SweepSummary[] = [];

    if (source === "toronto" || source === "all") {
      sweeps.push(await sweepToronto(admin).catch((e) => err("toronto_opendata", e)));
    }
    if (source === "urbantoronto" || source === "all") {
      sweeps.push(
        await sweepUrbanToronto(admin).catch((e) => err("urbantoronto", e)),
      );
    }
    if (source === "skyrisecities" || source === "all") {
      sweeps.push(
        await sweepUrbanToronto(admin, {
          indexUrl: SKYRISE_INDEX,
          sourceTag: "skyrisecities",
        }).catch((e) => err("skyrisecities", e)),
      );
    }
    if (source === "vancouver" || source === "all") {
      sweeps.push(
        await sweepVancouver(admin).catch((e) => err("vancouver_opendata", e)),
      );
    }
    if (source === "bild") {
      sweeps.push(await sweepBild(admin).catch((e) => err("bild", e)));
    }
    // A single association directory by tag, or the whole set.
    const dir = BUILDER_DIRECTORIES.find((d) => d.tag === source);
    if (dir && source !== "bild") {
      sweeps.push(
        await sweepBild(admin, { url: dir.url, tag: dir.tag }).catch((e) =>
          err(dir.tag, e),
        ),
      );
    }
    if (source === "builder-dirs") {
      sweeps.push(...(await sweepAllDirectories(admin)));
    }
    if (source === "seed-builders") {
      sweeps.push(
        await seedBuildersFromProjects(admin).catch((e) => err("seed_builders", e)),
      );
    }

    // News feeds (name-bearing signals) — individually, or all at once.
    const feed = NEWS_FEEDS.find((f) => f.tag === source);
    if (feed) {
      sweeps.push(await sweepNewsFeed(admin, feed).catch((e) => err(feed.tag, e)));
    }
    if (source === "urbanplanet" || source === "newsfeeds" || source === "all") {
      sweeps.push(
        await sweepUrbanPlanet(admin).catch((e) => err("urbanplanet_nashville", e)),
      );
    }
    if (source === "newsfeeds" || source === "all") {
      sweeps.push(...(await sweepAllNewsFeeds(admin)));
    }

    // Permit feeds (address watches) — individually, or all at once.
    if (permitSource(source)) {
      sweeps.push(
        await sweepPermits(admin, source).catch((e) => err(`${source}_permits`, e)),
      );
    }
    if (source === "permits") {
      sweeps.push(...(await sweepAllPermits(admin)));
    }

    // Ignition: every new signal goes through match → ingest → publish/draft.
    // Each one can cost a 30s research pass, so cap per run; the cron (or the
    // ui=1 runner refreshing) drains the rest.
    let outcomes: IgniteOutcome[] = [];
    if (ignite) {
      outcomes = await igniteNewSignals(admin, 3);
      await pingOps(outcomes).catch(() => null);
    }

    const { count: remaining } = await admin
      .from("discovery_signals")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    const body = {
      ranAt: new Date().toISOString(),
      sweeps,
      ignited: outcomes,
      signals_remaining: remaining ?? 0,
    };

    if (ui) {
      const more = (remaining ?? 0) > 0;
      const html = `<!doctype html><meta charset="utf-8">${
        more ? `<meta http-equiv="refresh" content="4">` : ""
      }<title>Discovery sweep</title><body style="font-family:ui-monospace,monospace;padding:24px;background:#0b1220;color:#e2e8f0"><h2 style="margin:0 0 12px">Discovery sweep ${
        more ? "— running…" : "— done"
      }</h2><pre style="white-space:pre-wrap">${JSON.stringify(body, null, 2)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")}</pre>${
        more
          ? `<p>${remaining} signal(s) left — this page refreshes until the queue is drained.</p>`
          : "<p>Queue drained.</p>"
      }</body>`;
      return new Response(html, { headers: { "content-type": "text/html" } });
    }
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

function err(source: string, e: unknown): SweepSummary {
  return {
    source,
    scanned: 0,
    added: 0,
    updated: 0,
    notes: [`ERROR: ${e instanceof Error ? e.message : String(e)}`],
  };
}
