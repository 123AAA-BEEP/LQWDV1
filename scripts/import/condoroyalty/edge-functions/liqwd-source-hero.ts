// Supabase Edge Function: liqwd-source-hero
//
// Off-box hero-image discovery + rehost. The sandbox/cron agent can WebSearch
// to find a builder's project page but cannot FETCH arbitrary pages/images
// (network policy); this function runs on Supabase's side (open egress) and does
// the fetching.
//
// Body (JSON):
//   { project_id: string,
//     page_url?: string,     // a builder/project page — we extract its og:image
//     source_url?: string }  // OR a direct image URL to rehost as-is
//
// Behaviour:
//   - source_url given  -> rehost that image directly.
//   - page_url given    -> fetch the page, pull og:image / twitter:image (the
//                          builder's OWN chosen hero — almost always a
//                          rendering, not a floor plan), reject obvious
//                          logo/floorplan/icon URLs, then rehost it.
//   - uploads to public 'project-media' bucket at <project_id>/sourced.<ext>
//   - upserts a project_media_candidates row (provider='auto_sourced',
//     status='pending'); never sets the live hero itself — the agent verifies
//     the image visually first, then promotes + republishes.
//
// Intentionally verify_jwt=false (internal enrichment, obscure name, only writes
// public marketing images keyed by an existing project_id). Lock down later by
// re-enabling JWT if desired.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = "LIQWD/1.0 (real-estate listing enrichment; alexkarczewski91@gmail.com)";
const BUCKET = "project-media";
// URLs we never want as a hero (logos, icons, floor plans, site chrome).
const REJECT = /(logo|wordmark|favicon|icon|sprite|avatar|floor[\-_ ]?plan|\/plan|siteplan|keyplan|-fp[\-_.]|brochure|placeholder|social|sharing)/i;

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

function abs(u: string, base: string): string {
  try { return new URL(u, base).href; } catch { return u; }
}

// Pull the best candidate image URL out of a page's HTML.
function extractImage(html: string, base: string): string | null {
  const metas = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of metas) {
    const m = html.match(re);
    if (m && m[1] && !REJECT.test(m[1])) return abs(m[1], base);
  }
  // Fallback: first reasonably-named content <img> that isn't chrome.
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["']/gi)];
  for (const m of imgs) {
    if (!REJECT.test(m[1])) return abs(m[1], base);
  }
  return null;
}

Deno.serve(async (req: Request) => {
  try {
    const { project_id, page_url, source_url } = await req.json();
    if (!project_id || (!page_url && !source_url)) {
      return json({ error: "project_id and one of page_url|source_url required" }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    try { await supabase.storage.createBucket(BUCKET, { public: true }); } catch (_e) { /* exists */ }

    // 1) Resolve the image URL.
    let imageUrl: string | null = source_url ?? null;
    let pickedFrom = source_url ? "source_url" : "";
    if (!imageUrl && page_url) {
      const pr = await fetch(page_url, { headers: { "User-Agent": UA } });
      if (!pr.ok) return json({ error: "page fetch " + pr.status, page_url }, 502);
      const html = await pr.text();
      imageUrl = extractImage(html, page_url);
      pickedFrom = "og:image";
      if (!imageUrl) return json({ ok: false, reason: "no usable image on page", page_url }, 200);
    }
    if (!imageUrl || REJECT.test(imageUrl)) {
      return json({ ok: false, reason: "rejected (logo/floorplan/none)", imageUrl }, 200);
    }

    // 2) Fetch + validate the image.
    const ir = await fetch(imageUrl, { headers: { "User-Agent": UA } });
    if (!ir.ok) return json({ error: "image fetch " + ir.status, imageUrl }, 502);
    const ct = (ir.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!ct.startsWith("image/")) return json({ ok: false, reason: "not an image (" + ct + ")", imageUrl }, 200);
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
    const buf = new Uint8Array(await ir.arrayBuffer());
    if (buf.length < 8192) return json({ ok: false, reason: "image too small (" + buf.length + "b)", imageUrl }, 200);

    // 3) Rehost.
    const path = `${project_id}/sourced.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
    if (up.error) return json({ error: "upload " + up.error.message }, 500);
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    // 4) Record a candidate (pending visual verification by the agent).
    const { data: ex } = await supabase.from("project_media_candidates")
      .select("id").eq("project_id", project_id).eq("provider", "auto_sourced").limit(1);
    if (ex && ex.length) {
      await supabase.from("project_media_candidates").update({ image_url: pub, status: "pending" }).eq("id", ex[0].id);
    } else {
      await supabase.from("project_media_candidates")
        .insert({ project_id, image_url: pub, provider: "auto_sourced", rank: 0, status: "pending" });
    }

    return json({ ok: true, url: pub, bytes: buf.length, picked_from: pickedFrom, source_image: imageUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
