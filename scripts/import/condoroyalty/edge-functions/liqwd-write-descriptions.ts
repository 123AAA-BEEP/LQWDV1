// Supabase Edge Function: liqwd-write-descriptions
// Batch engine for Phase 3. For each matched active Altus project (grouped so
// each development is queried once and applied to all its phase rows): looks up
// OSM POIs, builds a grounded amenity description (verified place names +
// computed distances only — never invented), and writes it to
// projects.description_ai_draft, tagging import_notes '[desc amenity v5]'.
//
// Copy style (v8): conversational + Canadian, and deliberately VARIED so the
// 140 listings don't read like one template. Distances are walk time up to
// ~10 min (<=800 m), flipping to drive time beyond that, plus a feet/km figure
// (dropped on the very-close "steps away" lines), never raw metres. Each
// sentence (opening, status, transit, shopping, parks, school) is picked from a
// pool of phrasings, and the amenity sentences are re-ordered — all driven by a
// stable hash of the project name, so every project reads differently yet always
// regenerates identically (no churn). Openings are enriched from structured
// Altus fields; property type is inferred from the name AND storeys
// (>=5 storeys => condominium); nearby POIs are de-duplicated by normalised name;
// multi-builder credits render as a proper "A, B and C" list.
//
// Body: { batch?: number=12, dry_run?: boolean, only_id?: uuid }.
//  - dry_run: build + return descriptions WITHOUT writing (preview).
//  - only_id: restrict to the one development containing this row id; this also
//    bypasses the "already v5" skip so a single project can be regenerated.
// Keep batches small (<=3) to stay under the edge worker compute limit; invoke
// repeatedly until remaining_projects = 0.
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
function normName(s: string): string { return s.toLowerCase().replace(/\b(station|subway|stop|go|line|transit)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim(); }
async function poisFor(lat: number, lng: number, radius = 1500) {
  const q = `[out:json][timeout:25];(nwr(around:${radius},${lat},${lng})[railway=station];nwr(around:${radius},${lat},${lng})[station=subway];nwr(around:${radius},${lat},${lng})[railway=tram_stop];way(around:${radius},${lat},${lng})[leisure=park];nwr(around:${radius},${lat},${lng})[amenity=school];nwr(around:${radius},${lat},${lng})[shop=supermarket];nwr(around:${radius},${lat},${lng})[shop=mall];);out center tags 80;`;
  const data = await overpass(q);
  const all: { name: string; category: string; distance_m: number }[] = [];
  for (const e of (data.elements || [])) {
    const t = e.tags || {}; const name = t.name; const cat = categorize(t);
    if (!name || !cat) continue;
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (la == null || lo == null) continue;
    all.push({ name, category: cat, distance_m: haversine(lat, lng, la, lo) });
  }
  all.sort((a, b) => a.distance_m - b.distance_m);
  const seen = new Set<string>();
  const items: { name: string; category: string; distance_m: number }[] = [];
  for (const it of all) { const key = it.category + "|" + normName(it.name); if (seen.has(key)) continue; seen.add(key); items.push(it); }
  return items;
}

function walkMin(m: number): number { return Math.max(1, Math.round(m / 80)); }
function driveMin(m: number): number { return Math.max(1, Math.round(m / 450)); }
function artMin(n: number): string { return (n === 8 || n === 11 || n === 18) ? "an" : "a"; }
function commas(n: number): string { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function metricFigure(m: number): string {
  if (m < 500) { const ft = Math.round((m * 3.28084) / 50) * 50; return `about ${commas(ft)} ft`; }
  return `about ${(m / 1000).toFixed(1)} km`;
}
function reachTime(m: number, cat: string): string {
  if (m <= 140) {
    const close: Record<string, string> = { transit: "right at the doorstep", shopping: "just steps away", park: "moments away", school: "just around the corner" };
    return close[cat] || "just steps away";
  }
  if (m <= 800) { const w = walkMin(m); return `${artMin(w)} ${w}-minute walk`; }
  const d = driveMin(m); return `${artMin(d)} ${d}-minute drive`;
}
function reach(m: number, cat: string): string { const t = reachTime(m, cat); return m <= 140 ? t : `${t} (${metricFigure(m)})`; }
function anN(n: number): string { const s = String(n); return (s[0] === "8" || n === 11 || n === 18 || (n >= 80 && n <= 89)) ? "an" : "a"; }
function transitLabel(name: string): string { return /stat|stop|\bGO\b|terminal|line/i.test(name) ? name : name + " station"; }
function builderPhrase(b: string): string { if (!b) return ""; const parts = String(b).split(/\s+and\s+/); if (parts.length >= 3) return " by " + parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1]; return " by " + b; }

// ---- Deterministic variety: a stable per-project hash picks a phrasing + order ----
function hashStr(str: string): number { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry(seed: number) { return function () { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle<T>(arr: T[], rng: () => number): T[] { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const tmp = a[i]; a[i] = a[j]; a[j] = tmp; } return a; }

const R = (x: any, c: string) => reach(x.distance_m, c);
const SELLING = [" Sales are now underway.", " It's now selling.", " The project is selling now.", " Sales have launched."];
const COMING = [" It's launching soon.", " Coming soon.", " A launch is on the horizon.", " Sales launch shortly."];
const TRANSIT1 = [
  (t: any) => `For transit, ${transitLabel(t.name)} is ${R(t, "transit")}.`,
  (t: any) => `${transitLabel(t.name)} is ${R(t, "transit")}, keeping the commute simple.`,
  (t: any) => `Commuters are well served, with ${transitLabel(t.name)} ${R(t, "transit")}.`,
  (t: any) => `The nearest transit is ${transitLabel(t.name)}, ${R(t, "transit")}.`,
];
const TRANSIT2 = [
  (a: any, b: any) => `Getting around is easy — ${transitLabel(a.name)} is ${R(a, "transit")} and ${transitLabel(b.name)} is ${R(b, "transit")}.`,
  (a: any, b: any) => `Transit is well covered: ${transitLabel(a.name)} is ${R(a, "transit")}, with ${transitLabel(b.name)} ${R(b, "transit")}.`,
  (a: any, b: any) => `${transitLabel(a.name)} is ${R(a, "transit")}, and ${transitLabel(b.name)} is ${R(b, "transit")} — transit is within easy reach.`,
  (a: any, b: any) => `Two stations are close by — ${transitLabel(a.name)} is ${R(a, "transit")} and ${transitLabel(b.name)} is ${R(b, "transit")}.`,
];
const SHOP = [
  (s: any) => `Day-to-day errands are covered, with ${s.name} ${R(s, "shopping")}.`,
  (s: any) => `For groceries and essentials, ${s.name} is ${R(s, "shopping")}.`,
  (s: any) => `Everyday shopping is handy — ${s.name} is ${R(s, "shopping")}.`,
  (s: any) => `${s.name} is ${R(s, "shopping")} for the weekly grocery run.`,
];
const PARK1 = [
  (p: any) => `For green space, ${p.name} is ${R(p, "park")}.`,
  (p: any) => `Outdoor space is close, with ${p.name} ${R(p, "park")}.`,
  (p: any) => `${p.name} is ${R(p, "park")} for time outdoors.`,
  (p: any) => `Nearby green space includes ${p.name}, ${R(p, "park")}.`,
];
const PARK2 = [
  (a: any, b: any) => `For green space, ${a.name} is ${R(a, "park")}, and ${b.name} is close by too.`,
  (a: any, b: any) => `Green space is plentiful — ${a.name} is ${R(a, "park")}, with ${b.name} nearby as well.`,
  (a: any, b: any) => `${a.name} is ${R(a, "park")}, and you'll also find ${b.name} close by.`,
  (a: any, b: any) => `Two parks sit nearby — ${a.name} is ${R(a, "park")}, and ${b.name} is just beyond.`,
];
const SCHOOL = [
  (s: any) => `${s.name} is ${R(s, "school")}, a draw for families.`,
  (s: any) => `Families are close to ${s.name}, ${R(s, "school")}.`,
  (s: any) => `For families, ${s.name} is ${R(s, "school")}.`,
  (s: any) => `${s.name} is ${R(s, "school")} — convenient for families.`,
];

function buildDesc(p: any, pois: any[]): string {
  const name = p.project_name;
  const isTown = /\b(towns|townhome|townhomes|townhouse|townhouses)\b/i.test(name);
  const nameCondo = /\b(condo|condos|condominium|condominiums|residence|residences|tower|towers|loft|lofts)\b/i.test(name);
  const storeys = Number(p.storeys) || 0;
  const units = Number(p.total_units) || 0;
  const isCondo = !isTown && (nameCondo || storeys >= 5);
  const boutique = isCondo && storeys > 0 && storeys <= 8;
  let lead: string;
  if (isCondo && storeys > 0) lead = boutique ? `a boutique ${storeys}-storey condominium` : `${anN(storeys)} ${storeys}-storey condominium`;
  else if (isCondo) lead = "a condominium";
  else if (isTown) lead = "a townhome development";
  else lead = "a new home development";
  const cityDisp = p.city === "Old Toronto" ? "Toronto" : (["North York", "Scarborough", "Etobicoke", "East York", "York"].includes(p.city) ? p.city + ", Toronto" : p.city);
  const place = p.neighbourhood ? `in ${p.neighbourhood}, ${cityDisp}` : `in ${cityDisp}`;
  const builder = builderPhrase(p.builder_name);
  const unitPhrase = units > 0 ? (isCondo ? `, with ${units} suites` : `, with ${units} homes`) : "";
  const seed = (p.project_name || "") + "|" + (p.city || "");
  const pick = (arr: any[], salt: string) => arr[hashStr(seed + "|" + salt) % arr.length];
  const capPlace = place.charAt(0).toUpperCase() + place.slice(1);
  const OPENINGS = [
    () => `${name} is ${lead}${builder} ${place}${unitPhrase}.`,
    () => `${capPlace}, ${name} is ${lead}${builder}${unitPhrase}.`,
  ];
  const statusArr = p.sales_status === "selling" ? SELLING : p.sales_status === "coming_soon" ? COMING : [""];
  let s = pick(OPENINGS, "open")() + pick(statusArr, "status");
  const byCat: Record<string, any[]> = {};
  for (const i of pois) (byCat[i.category] ||= []).push(i);
  const parts: string[] = [];
  if (byCat.transit?.length) { const t = byCat.transit; parts.push(t.length >= 2 ? pick(TRANSIT2, "transit")(t[0], t[1]) : pick(TRANSIT1, "transit")(t[0])); }
  if (byCat.shopping?.length) parts.push(pick(SHOP, "shop")(byCat.shopping[0]));
  if (byCat.park?.length) { const ps = byCat.park.slice(0, 2); parts.push(ps.length >= 2 ? pick(PARK2, "park")(ps[0], ps[1]) : pick(PARK1, "park")(ps[0])); }
  if (byCat.school?.length) parts.push(pick(SCHOOL, "school")(byCat.school[0]));
  const ordered = shuffle(parts, mulberry(hashStr(seed + "|order")));
  if (ordered.length) s += " " + ordered.join(" ");
  return s;
}
function json(o: any, status = 200) { return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } }); }

Deno.serve(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const batch = body.batch ?? 12;
  const dry = !!body.dry_run;
  const onlyId = body.only_id || null;
  const TAG = "[desc amenity v5]";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: rows, error } = await supabase.from("projects")
    .select("id,project_name,city,neighbourhood,builder_name,sales_status,storeys,total_units,latitude,longitude,import_notes")
    .eq("external_source", "Altus Group").in("sales_status", ["selling", "coming_soon"])
    .neq("record_status", "published").not("latitude", "is", null).limit(800);
  if (error) return json({ error: error.message }, 500);
  const groups = new Map<string, any[]>();
  for (const r of (rows || [])) {
    if (!onlyId && String(r.import_notes || "").includes("desc amenity v5")) continue;
    const k = (r.project_name || "") + "|" + (r.city || "");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  let keys = [...groups.keys()];
  if (onlyId) {
    let target: string | null = null;
    for (const [k, g] of groups) if (g.some((r) => r.id === onlyId)) { target = k; break; }
    keys = target ? [target] : [];
  }
  const todo = keys.slice(0, dry ? Math.min(batch, 8) : batch);
  const out: any[] = [];
  for (const k of todo) {
    const g = groups.get(k)!;
    const p = g[0];
    try {
      const pois = await poisFor(Number(p.latitude), Number(p.longitude));
      const desc = buildDesc(p, pois);
      if (dry) { out.push({ project: p.project_name, description: desc }); continue; }
      for (const row of g) {
        const base = String(row.import_notes || "").replace(/ ?\[desc amenity v\d+\]/g, "");
        await supabase.from("projects").update({ description_ai_draft: desc, import_notes: (base + " " + TAG).trim() }).eq("id", row.id);
      }
      out.push({ project: p.project_name, description: desc });
    } catch (_e) { /* leave pending for next run */ }
  }
  return json({ dry_run: dry, processed_projects: dry ? 0 : out.length, remaining_projects: keys.length - (dry ? 0 : out.length), results: out });
});
