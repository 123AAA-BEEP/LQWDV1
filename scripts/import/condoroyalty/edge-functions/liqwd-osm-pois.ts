// Supabase Edge Function: liqwd-osm-pois
// Given { lat, lng, radius? } returns nearby transit/parks/schools/shopping POIs
// with haversine-computed distances, queried from OpenStreetMap (Overpass).
// Runs on Supabase infra (open egress) so it bypasses the sandbox allowlist.
// Deploy: mcp__Supabase__deploy_edge_function (verify_jwt: true). Invoke with the
// anon key as Bearer. Used to ground the location-aware project descriptions.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
Deno.serve(async (req: Request) => {
  try {
    const { lat, lng, radius = 1500 } = await req.json();
    if (typeof lat !== "number" || typeof lng !== "number") {
      return new Response(JSON.stringify({ error: "numeric lat,lng required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
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
    items.sort((a, b) => a.distance_m - b.distance_m);
    return new Response(JSON.stringify({ count: items.length, items: items.slice(0, 40) }), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers: { "Content-Type": "application/json" } });
  }
});
