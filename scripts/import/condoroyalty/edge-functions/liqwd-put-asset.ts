// Supabase Edge Function: liqwd-put-asset
//
// Lets the live site accept a drag-and-dropped landing-page image straight from
// the user's machine and store it in the public 'project-media' bucket, so the
// marketing pages can read it by a stable URL — no git commit / redeploy needed.
//
// Accepts EITHER:
//   - multipart/form-data: fields `path` + `file`  (browser drag-drop upload)
//   - application/json:     { path, source_url }    (seed a path from a URL)
//
// Hardened for a public (verify_jwt=false) endpoint: `path` is allow-listed to a
// fixed set of landing slots, image content-type only, size-capped. Worst case
// an abuser can overwrite one of those specific marketing images (reversible) —
// lock behind auth later if desired.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "project-media";
const ALLOW = new Set(["landing/dev-hero.jpg", "landing/dev-discreet.jpg"]);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ctype = req.headers.get("content-type") || "";

    let path = "";
    let bytes: Uint8Array;
    let contentType = "image/jpeg";

    if (ctype.includes("multipart/form-data")) {
      const form = await req.formData();
      path = String(form.get("path") || "");
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "file field required" }, 400);
      contentType = file.type || "image/jpeg";
      bytes = new Uint8Array(await file.arrayBuffer());
    } else {
      const body = await req.json();
      path = String(body.path || "");
      if (!body.source_url) return json({ error: "multipart file or source_url required" }, 400);
      const r = await fetch(body.source_url);
      if (!r.ok) return json({ error: "fetch " + r.status }, 502);
      contentType = (r.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
      bytes = new Uint8Array(await r.arrayBuffer());
    }

    if (!ALLOW.has(path)) return json({ error: "path not allowed", allowed: [...ALLOW] }, 403);
    if (!contentType.startsWith("image/")) return json({ error: "not an image (" + contentType + ")" }, 415);
    if (bytes.length < 2048 || bytes.length > 8_000_000) return json({ error: "bad size " + bytes.length }, 422);

    const up = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true, cacheControl: "60" });
    if (up.error) return json({ error: "upload " + up.error.message }, 500);
    const pub = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    return json({ ok: true, url: pub, bytes: bytes.length, contentType });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
