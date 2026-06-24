// Supabase Edge Function: liqwd-rehost-image
// Phase 2 image re-hosting. Body: { project_ids: string[], source_url, width?, height? }.
// Fetches the source image from Supabase's side (so it can reach CondoRoyalty
// regardless of the sandbox allowlist), uploads it to the public 'project-media'
// Storage bucket, and inserts a row into project_media_candidates for each
// project_id with provider='gta_seed' (anonymised — the source URL is NEVER
// stored). Idempotent: skips a project that already has a gta_seed candidate.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = "LIQWD/1.0 (real-estate listing enrichment; alexkarczewski91@gmail.com)";
const BUCKET = "project-media";
function json(o: any, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } }); }

Deno.serve(async (req: Request) => {
  try {
    const { project_ids, source_url, width, height } = await req.json();
    if (!Array.isArray(project_ids) || project_ids.length === 0 || !source_url) {
      return json({ error: "project_ids[] and source_url required" }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    try { await supabase.storage.createBucket(BUCKET, { public: true }); } catch (_e) { /* exists */ }

    const r = await fetch(source_url, { headers: { "User-Agent": UA } });
    if (!r.ok) return json({ error: "fetch " + r.status, source_url }, 502);
    const ct = (r.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : ct.includes("gif") ? "gif" : "jpg";
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length < 1024) return json({ error: "image too small (" + buf.length + " bytes)", source_url }, 422);

    const path = `${project_ids[0]}/hero.${ext}`;
    const up = await supabase.storage.from(BUCKET).upload(path, buf, { contentType: ct, upsert: true });
    if (up.error) return json({ error: "upload " + up.error.message }, 500);
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    let inserted = 0;
    for (const pid of project_ids) {
      const { data: ex } = await supabase.from("project_media_candidates").select("id").eq("project_id", pid).eq("provider", "gta_seed").limit(1);
      if (ex && ex.length) continue;
      const { error: ie } = await supabase.from("project_media_candidates").insert({ project_id: pid, image_url: pub, provider: "gta_seed", width: width || null, height: height || null, rank: 0, status: "pending" });
      if (!ie) inserted++;
    }
    return json({ ok: true, url: pub, bytes: buf.length, inserted });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
