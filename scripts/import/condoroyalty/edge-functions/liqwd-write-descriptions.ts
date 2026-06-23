// Supabase Edge Function: liqwd-write-descriptions
// Batch engine for Phase 3. For each matched active Altus project (grouped so
// each development is queried once and applied to all its phase rows): looks up
// OSM POIs, builds a grounded amenity description (verified place names +
// computed distances only — never invented), and writes it to
// projects.description_ai_draft, tagging import_notes '[desc amenity v2]'.
// Body: { batch?: number } (default 12). Keep batches small (<=15) to stay under
// the edge worker compute limit. Invoke repeatedly until remaining_projects = 0.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const UA = "LIQWD/1.0 (real-estate listing enrichment; alexkarczewski91@gmail.com)";

async function overpass(q: string): Promise<any> {
  let lastErr = "";
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA, "Accept": "application/json" }, body: "data=" + encodeURIComponent(q) });
      if (r.ok) return await r.json();
      lastErr = ep + " -> " + r.status;
    } catch (e) { lastErr = ep + " -> " + String(e); }
  }
  throw new Error(lastErr);
}
function haversine(la1: number, lo1: number, la2: number, lo2: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLa = toRad(la2 - la1), dLo = toRad(lo2 - lo1);
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(la1)) * Math.cos(toRad(la2)) * Math.sin(dLo / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function categorize(t: Record<string, string>): string | null {
  if (t.railway === "station" || t.station === "subway" || t.public_transport === "station") return "transit";
  if (t.railway === "tram_stop" || t.light_rail === "yes") return "transit";
  if (t.leisure === "park" || t.leisure === "nature_reserve") return "park";
  if (t.amenity === "school") return "school";
  if (t.shop === "supermarket" || t.shop === "mall" || t.shop === "department_store") return "shopping";
  return null;
}
async function poisFor(lat: number, lng: number, radius = 1500) {
  const q = `[out:json][timeout:25];(nwr(around:${radius},${lat},${lng})[railway=station];nwr(around:${radius},${lat},${lng})[station=subway];nwr(around:${radius},${lat},${lng})[railway=tram_stop];way(around:${radius},${lat},${lng})[leisure=park];nwr(around:${radius},${lat},${lng})[amenity=school];nwr(around:${radius},${lat},${lng})[shop=supermarket];nwr(around:${radius},${lat},${lng})[shop=mall];);out center tags 80;`;
  const data = await overpass(q);
  const seen = new Set<string>();
  const items: { name: string; category: string; distance_m: number }[] = [];
  for (const e of (data.elements || [])) {
    const t = e.tags || {}; const name = t.name; const cat = categorize(t);
    if (!name || !cat) continue;
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (la == null || lo == null) continue;
    const key = cat + "|" + name; if (seen.has(key)) continue; seen.add(key);
    items.push({ name, category: cat, distance_m: haversine(lat, lng, la, lo) });
  }
  return items.sort((a, b) => a.distance_m - b.distance_m);
}
function dist(m: number): string { return m >= 1000 ? `about ${(m / 1000).toFixed(1)} km` : `about ${Math.round(m / 10) * 10} m`; }
function buildDesc(p: any, pois: any[]): string {
  const name = p.project_name;
  const type = /\b(towns|townhome|townhomes|townhouse|townhouses)\b/i.test(name) ? "townhome development"
    : /\b(condo|condos|condominium|condominiums|residence|residences|tower|towers|loft|lofts)\b/i.test(name) ? "condominium development"
    : "new home development";
  const cityDisp = p.city === "Old Toronto" ? "Toronto" : (["North York", "Scarborough", "Etobicoke", "East York", "York"].includes(p.city) ? p.city + ", Toronto" : p.city);
  const loc = p.neighbourhood ? `the ${p.neighbourhood} area of ${cityDisp}` : cityDisp;
  const builder = p.builder_name ? ` by ${p.builder_name}` : "";
  const status = p.sales_status === "selling" ? "The project is currently selling." : p.sales_status === "coming_soon" ? "The project is coming soon." : "";
  let s = `${name} is a ${type}${builder} in ${loc}. ${status}`.trim();
  const byCat: Record<string, any[]> = {};
  for (const i of pois) (byCat[i.category] ||= []).push(i);
  const sents: string[] = [];
  if (byCat.transit?.length) sents.push(`The nearest rapid transit is ${byCat.transit[0].name}, ${dist(byCat.transit[0].distance_m)} away.`);
  if (byCat.park?.length) { const ps = byCat.park.slice(0, 2).map((x) => x.name); sents.push(`Nearby green space includes ${ps.join(" and ")} (${dist(byCat.park[0].distance_m)}).`); }
  if (byCat.shopping?.length) sents.push(`For everyday errands, ${byCat.shopping[0].name} is ${dist(byCat.shopping[0].distance_m)} away.`);
  if (byCat.school?.length) sents.push(`Families are close to ${byCat.school[0].name}, ${dist(byCat.school[0].distance_m)} from the site.`);
  if (sents.length) s += " " + sents.join(" ");
  return s;
}
function json(o: any, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } }); }

Deno.serve(async (req: Request) => {
  const { batch = 12 } = await req.json().catch(() => ({}));
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error } = await supabase.from("projects")
    .select("id,project_name,city,neighbourhood,builder_name,sales_status,latitude,longitude,import_notes")
    .eq("external_source", "Altus Group").in("sales_status", ["selling", "coming_soon"])
    .neq("record_status", "published").not("latitude", "is", null).limit(800);
  if (error) return json({ error: error.message }, 500);
  const groups = new Map<string, any[]>();
  for (const r of (rows || [])) {
    if (String(r.import_notes || "").includes("desc amenity")) continue;
    const k = (r.project_name || "") + "|" + (r.city || "");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const keys = [...groups.keys()];
  const todo = keys.slice(0, batch);
  const done: string[] = [];
  for (const k of todo) {
    const g = groups.get(k)!;
    const p = g[0];
    try {
      const pois = await poisFor(Number(p.latitude), Number(p.longitude));
      const desc = buildDesc(p, pois);
      for (const row of g) {
        await supabase.from("projects").update({ description_ai_draft: desc, import_notes: (row.import_notes || "") + " [desc amenity v2]" }).eq("id", row.id);
      }
      done.push(p.project_name);
    } catch (_e) { /* left pending for next run */ }
  }
  return json({ processed_projects: done.length, remaining_projects: keys.length - done.length, sample: done });
});
