import { createAdminClient } from "@/lib/supabase/admin";
import seedData from "@/lib/iciworld/seed-data.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ICIWorld importer.
 *
 * ?key=<INBOUND_EMAIL_SECRET> is required (so it's not public). Modes:
 *   mode=probe&u=<url>  — fetch a page server-side and stash HTML in iciworld_raw
 *                         (used to develop the parser; default target Result1.jsp).
 *   mode=seed           — bulk-insert the parsed Haves & Wants board (seed-data.json)
 *                         into off_market_listings as UNCLAIMED rows. Idempotent:
 *                         skips source_refs already present.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

type Seed = { ref: string; title: string; kind: string; status: string | null };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const mode = url.searchParams.get("mode") ?? "probe";
  const admin = createAdminClient();

  // ---- SEED: insert the parsed board as unclaimed off-market listings -------
  if (mode === "seed") {
    const rows = seedData as Seed[];
    const { data: existing } = await admin
      .from("off_market_listings")
      .select("source_ref")
      .eq("source", "iciworld");
    const have = new Set(
      ((existing ?? []) as { source_ref: string | null }[])
        .map((r) => r.source_ref)
        .filter(Boolean),
    );

    const toInsert = rows
      .filter((r) => !have.has(r.ref))
      .map((r) => ({
        source: "iciworld",
        source_ref: r.ref,
        title: r.title,
        post_kind: r.kind,
        listing_status: r.status,
      }));

    let inserted = 0;
    const errors: string[] = [];
    for (let i = 0; i < toInsert.length; i += 500) {
      const batch = toInsert.slice(i, i + 500);
      const { error } = await admin.from("off_market_listings").insert(batch);
      if (error) errors.push(error.message);
      else inserted += batch.length;
    }

    return Response.json({
      ok: errors.length === 0,
      total: rows.length,
      alreadyPresent: have.size,
      inserted,
      errors,
    });
  }

  // ---- PROBE: fetch a page and stash its HTML for parser development --------
  // ICIWorld 500s/403s bare server requests, so prime a session first: GET the
  // homepage to collect Set-Cookie, then request the target with that cookie +
  // a same-site Referer, mimicking a real browser navigation.
  const target = url.searchParams.get("u") ?? "https://iciworld.com/Result1.jsp";
  const browserHeaders: Record<string, string> = {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
    "Upgrade-Insecure-Requests": "1",
  };
  try {
    // 1) Prime cookies from the homepage (best-effort).
    let cookie = "";
    try {
      const home = await fetch("https://iciworld.com/", {
        headers: browserHeaders,
        redirect: "follow",
      });
      // Drain the body so the connection completes; we only want the cookie.
      await home.text();
      const sc = home.headers.get("set-cookie");
      if (sc) cookie = sc.split(",").map((c) => c.split(";")[0].trim()).join("; ");
    } catch {
      /* homepage priming is best-effort */
    }

    // 2) Fetch the real target with the primed cookie + a same-site referer.
    const res = await fetch(target, {
      headers: {
        ...browserHeaders,
        Referer: "https://iciworld.com/",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      redirect: "follow",
    });
    const body = await res.text();
    await admin.from("iciworld_raw").insert({
      url: res.url,
      http_status: res.status,
      content_type: res.headers.get("content-type"),
      body: body.slice(0, 300_000),
      note: `mode=${mode} fullLength=${body.length} cookie=${cookie ? "yes" : "no"}`,
    });
    return Response.json({
      ok: res.status < 400,
      status: res.status,
      finalUrl: res.url,
      length: body.length,
      primedCookie: Boolean(cookie),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("iciworld_raw")
      .insert({ url: target, note: `ERROR: ${message}` });
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
