import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * ICIWorld importer — PROBE stage.
 *
 * The sandbox can't reach iciworld.com, so this Vercel route fetches a target
 * page server-side and stashes the HTML into the admin-only `iciworld_raw`
 * table, where the parser can be developed against the real markup (read via the
 * Supabase tools). Gated by the existing INBOUND_EMAIL_SECRET so it's not public.
 *
 * Trigger in a browser:
 *   /api/iciworld-import?key=<INBOUND_EMAIL_SECRET>&mode=probe
 *   /api/iciworld-import?key=...&mode=probe&u=<encoded url>   (override target)
 *
 * mode=import (the real seed) is added once the parse is confirmed.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || url.searchParams.get("key") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const mode = url.searchParams.get("mode") ?? "probe";
  const target =
    url.searchParams.get("u") ?? "https://iciworld.com/Result1.jsp";

  const admin = createAdminClient();

  try {
    const res = await fetch(target, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-CA,en;q=0.9",
      },
      redirect: "follow",
    });
    const body = await res.text();

    await admin.from("iciworld_raw").insert({
      url: res.url,
      http_status: res.status,
      content_type: res.headers.get("content-type"),
      body: body.slice(0, 300_000), // enough to see the listing structure
      note: `mode=${mode} fullLength=${body.length}`,
    });

    return Response.json({
      ok: true,
      status: res.status,
      finalUrl: res.url,
      length: body.length,
      stored: Math.min(body.length, 300_000),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await admin
      .from("iciworld_raw")
      .insert({ url: target, note: `ERROR: ${message}` });
    return Response.json({ ok: false, error: message }, { status: 502 });
  }
}
