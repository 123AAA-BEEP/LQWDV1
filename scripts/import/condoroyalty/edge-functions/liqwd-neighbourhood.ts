// Supabase Edge Function: liqwd-neighbourhood
//
// Structured "what's nearby" enrichment for a project, used by the public
// project page, the broker project view, and the quick-fact sheet. Runs on
// Supabase's side (open egress) because the sandbox/cron agent can WebSearch
// but cannot FETCH arbitrary services (network policy).
//
// Pipeline per project:
//   1. Use projects.latitude/longitude if present; else geocode via Nominatim
//      (structured query first, then free-text address / intersection / name),
//      validating the result city (Toronto + its former boroughs treated as one)
//      so a wrong-city match is rejected. Writes back lat/long + geo_confidence.
//   2. Query OpenStreetMap / Overpass (rotating mirrors + retry) for hospitals,
//      shopping malls, schools, universities/colleges, supermarkets, parks,
//      transit stations, and points of interest within per-category radii.
//   3. Keep the nearest 6 per category (name + straight-line distance), and
//      persist to public_project_pages.neighbourhood_features (jsonb).
//
// Geocode failures are marked with a { _unresolved: true } sentinel so the
// batch driver doesn't retry them forever and the UI renders nothing.
//
// Body (JSON), any one of:
//   { project_id }            -> enrich + persist one project
//   { project_id, dry_run:true } -> compute, don't persist
//   { batch: N }              -> enrich up to N un-enriched published projects
//   { lat, lon }              -> ad-hoc probe (no persist)
//
// verify_jwt=false: internal enrichment, obscure name, writes only public-safe
// map data keyed by an existing project_id.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const UA = "LIQWD/1.0 (neighbourhood enrichment; alexkarczewski91@gmail.com)";
const OVERPASS_EPS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const NOMINATIM = "https://nominatim.openstreetmap.org/search";
// deno-lint-ignore no-explicit-any
type Any = any;

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function dist(la1: number, lo1: number, la2: number, lo2: number) {
  const R = 6371000, toR = (d: number) => (d * Math.PI) / 180;
  const dLa = toR(la2 - la1), dLo = toR(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toR(la1)) * Math.cos(toR(la2)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function norm(s: string) { return (s || "").toLowerCase().replace(/[^a-z]/g, ""); }
const TO = new Set(["toronto", "etobicoke", "scarborough", "northyork", "eastyork", "york", "oldtoronto"]);
function cityMatch(expect: string | null | undefined, got: string): boolean {
  const e = norm(expect || ""), g = norm(got);
  if (!e) return true;
  if (e.includes(g) || g.includes(e)) return true;
  if (TO.has(e) && TO.has(g)) return true;
  return false;
}
function classify(t: Record<string, string>): string | null {
  if (t.amenity === "hospital") return "hospitals";
  if (t.shop === "mall") return "shopping";
  if (t.amenity === "school") return "schools";
  if (t.amenity === "university" || t.amenity === "college") return "postsecondary";
  if (t.shop === "supermarket") return "groceries";
  if (t.leisure === "park" || t.leisure === "nature_reserve") return "parks";
  if (t.railway === "station" || t.station === "subway" || t.public_transport === "station") return "transit";
  if (t.tourism === "attraction" || t.amenity === "theatre" || t.leisure === "stadium") return "poi";
  return null;
}
async function nomGet(params: Record<string, string>, expectCity?: string | null) {
  const u = new URL(NOMINATIM);
  u.searchParams.set("format", "jsonv2"); u.searchParams.set("addressdetails", "1");
  u.searchParams.set("limit", "1"); u.searchParams.set("countrycodes", "ca");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const r = await fetch(u.toString(), { headers: { "User-Agent": UA } });
  const g = await r.json();
  if (!g?.length) return null;
  const a = g[0].address ?? {};
  const gcity = (a.city || a.town || a.municipality || a.village || a.suburb || a.county || "").toString();
  return { lat: parseFloat(g[0].lat), lon: parseFloat(g[0].lon), gcity, cityOk: cityMatch(expectCity, gcity) };
}
async function geocodeProject(p: Any, city?: string | null) {
  const street = (p?.address_full || "").split(/[\n,]/)[0].trim();
  const cands: Array<{ params: Record<string, string> }> = [];
  if (street && city) cands.push({ params: { street, city, state: "Ontario" } });
  if (p?.address_full) cands.push({ params: { q: p.address_full } });
  if (p?.intersection_primary && p?.intersection_secondary) cands.push({ params: { q: `${p.intersection_primary} & ${p.intersection_secondary}, ${city}, Ontario` } });
  if (p?.project_name) cands.push({ params: { q: `${p.project_name}, ${city}, Ontario` } });
  for (const c of cands) {
    const gc = await nomGet(c.params, city);
    if (gc && gc.cityOk) return { lat: gc.lat, lon: gc.lon };
    await sleep(300);
  }
  return { lat: null, lon: null };
}
function buildQuery(lat: number, lon: number) {
  const R = (r: number) => `(around:${r},${lat},${lon})`;
  return `[out:json][timeout:20];(` +
    `nwr["amenity"="hospital"]${R(7000)};nwr["shop"="mall"]${R(7000)};nwr["amenity"="school"]${R(2500)};` +
    `nwr["amenity"="university"]${R(8000)};nwr["amenity"="college"]${R(8000)};nwr["shop"="supermarket"]${R(2000)};` +
    `nwr["leisure"="park"]${R(2500)};nwr["leisure"="nature_reserve"]${R(3000)};nwr["railway"="station"]${R(3500)};` +
    `nwr["station"="subway"]${R(3500)};nwr["tourism"="attraction"]${R(4000)};nwr["amenity"="theatre"]${R(4000)};` +
    `);out center tags 300;`;
}
async function overpass(lat: number, lon: number) {
  const body = "data=" + encodeURIComponent(buildQuery(lat, lon));
  let lastErr = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    const ep = OVERPASS_EPS[attempt % OVERPASS_EPS.length];
    try {
      const or = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA }, body });
      if (!or.ok) { lastErr = "overpass " + or.status; await sleep(700); continue; }
      const txt = await or.text();
      let od: Any; try { od = JSON.parse(txt); } catch { lastErr = "parse"; await sleep(700); continue; }
      const PS_RE = /(universit|college|polytechnic|seminary)/i;
      const out: Record<string, Array<Record<string, unknown>>> = { hospitals: [], shopping: [], schools: [], postsecondary: [], groceries: [], parks: [], transit: [], poi: [] };
      const seen = new Set<string>();
      for (const el of od.elements ?? []) {
        const t = (el.tags ?? {}) as Record<string, string>;
        const name = t.name; if (!name) continue;
        const cat = classify(t); if (!cat) continue;
        if (cat === "postsecondary" && !PS_RE.test(name)) continue;
        const elat = el.lat ?? el.center?.lat, elon = el.lon ?? el.center?.lon;
        if (elat == null || elon == null) continue;
        const key = cat + "|" + norm(name); if (seen.has(key)) continue; seen.add(key);
        out[cat].push({ name, distance_m: Math.round(dist(lat, lon, elat, elon)), kind: cat === "transit" ? (t.station ?? t.railway ?? t.network ?? null) : null });
      }
      for (const k of Object.keys(out)) { out[k].sort((a, b) => (a.distance_m as number) - (b.distance_m as number)); out[k] = out[k].slice(0, 6); }
      return out;
    } catch (e) { lastErr = String(e); await sleep(700); }
  }
  throw new Error(lastErr);
}
async function enrichProject(supabase: Any, project_id: string, persist: boolean) {
  const { data: p } = await supabase.from("projects")
    .select("project_name, address_full, city, province, intersection_primary, intersection_secondary, latitude, longitude, geo_confidence")
    .eq("id", project_id).maybeSingle();
  if (!p) return { project_id, ok: false, reason: "not_found" };
  let lat = p.latitude, lon = p.longitude, confidence = p.geo_confidence, didGeocode = false;
  if (lat == null || lon == null) {
    const gc = await geocodeProject(p, p.city);
    if (gc.lat == null) {
      if (persist) await supabase.from("public_project_pages").update({ neighbourhood_features: { _unresolved: true }, neighbourhood_updated_at: new Date().toISOString() }).eq("project_id", project_id);
      return { project_id, name: p.project_name, ok: false, reason: "geocode_unresolved" };
    }
    lat = gc.lat; lon = gc.lon; confidence = "geocoded"; didGeocode = true;
  }
  const features = await overpass(lat, lon);
  if (persist) {
    if (didGeocode) await supabase.from("projects").update({ latitude: lat, longitude: lon, geo_confidence: confidence }).eq("id", project_id);
    await supabase.from("public_project_pages").update({ neighbourhood_features: features, neighbourhood_updated_at: new Date().toISOString() }).eq("project_id", project_id);
  }
  const total = Object.values(features).reduce((a, v) => a + (v as unknown[]).length, 0);
  return { project_id, name: p.project_name, ok: true, confidence, didGeocode, total };
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json().catch(() => ({} as Any));
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (body.batch) {
      const limit = Math.min(Number(body.batch) || 25, 50);
      const force = body.force === true;
      let qy = supabase.from("public_project_pages")
        .select("project_id, neighbourhood_features, projects!inner(record_status, public_page_enabled)")
        .eq("is_active", true).eq("projects.record_status", "published").eq("projects.public_page_enabled", true)
        .limit(limit);
      if (!force) qy = qy.is("neighbourhood_features", null);
      const { data: rows, error } = await qy;
      if (error) return json({ error: error.message }, 500);
      const start = Date.now();
      const results: unknown[] = []; const failures: unknown[] = []; let processed = 0;
      for (const row of rows ?? []) {
        if (Date.now() - start > 125000) break;
        try {
          const r = await enrichProject(supabase, (row as Any).project_id, true);
          processed++;
          if (r.ok) results.push({ id: r.project_id, name: r.name, conf: r.confidence, total: r.total });
          else failures.push({ id: r.project_id, name: r.name, reason: r.reason });
        } catch (e) { failures.push({ id: (row as Any).project_id, reason: String(e) }); }
        await sleep(500);
      }
      return json({ ok: true, candidates: (rows ?? []).length, processed, succeeded: results.length, failures, results });
    }
    if (body.project_id) { const r = await enrichProject(supabase, body.project_id, body.dry_run !== true); return json(r); }
    if (body.lat != null && body.lon != null) { const features = await overpass(Number(body.lat), Number(body.lon)); return json({ ok: true, lat: body.lat, lon: body.lon, features }); }
    return json({ error: "project_id, batch, or lat/lon required" }, 400);
  } catch (e) { return json({ error: String(e) }, 500); }
});
