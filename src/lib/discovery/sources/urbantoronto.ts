import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addressNorm, cityNorm } from "../normalize";
import type { SweepSummary } from "./toronto";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * UrbanToronto database sweep — the name-bearing feed. UT catalogues GTA
 * developments (name, address, developer, storeys, units) often at the
 * pre-marketing stage, which is exactly the "starting gun" signal the engine
 * cross-references against the planning-application watchlist.
 *
 * Structure is discovered defensively (probe mode returns the raw shape);
 * the sweep never trusts a selector that didn't match.
 */
const UA = {
  "user-agent":
    "Mozilla/5.0 (compatible; LIQWD-discovery/1.0; +https://liqwd.ca)",
  accept: "text/html,application/xhtml+xml",
};

const DEFAULT_INDEX = "https://urbantoronto.ca/database/projects";

async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${url.slice(0, 120)}`);
  return await res.text();
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull "Label: value"-ish fields out of a UT project page, format-agnostic. */
function labelled(text: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*:?\\s+([^|•]{2,90}?)(?=\\s{2,}|\\s(?:[A-Z][a-z]+s?:)|$)`, "i");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function projectLinks(html: string, base: string): { url: string; text: string }[] {
  const out: { url: string; text: string }[] = [];
  const seen = new Set<string>();
  const re = /<a[^>]+href="([^"]*\/database\/projects\/[a-z0-9][^"#?]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = new URL(m[1], base).toString();
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, text: stripTags(m[2]).slice(0, 120) });
  }
  return out;
}

export async function probeUrbanToronto(url?: string): Promise<unknown> {
  const target = url ?? DEFAULT_INDEX;
  const html = await fetchText(target);
  const links = projectLinks(html, target);
  return {
    url: target,
    bytes: html.length,
    project_links_found: links.length,
    first_links: links.slice(0, 12),
    text_head: stripTags(html).slice(0, 1200),
  };
}

interface ParsedProject {
  name: string;
  address: string | null;
  city: string | null;
  developer: string | null;
  storeys: number | null;
  units: number | null;
  status: string | null;
}

const CITY_RE =
  /\b(Toronto|Mississauga|Vaughan|Brampton|Markham|Richmond Hill|Oakville|Burlington|Hamilton|Milton|Pickering|Ajax|Whitby|Oshawa|Clarington|Bowmanville|Courtice|Etobicoke|North York|Scarborough|Barrie|Innisfil|Kitchener|Waterloo|Cambridge|Guelph|Newmarket|Aurora|King City|Thornhill|Stouffville|Whitchurch-Stouffville|Uxbridge|Georgina|Halton Hills|Georgetown|Caledon|Orangeville|Bradford|Ottawa|London|Brantford|Niagara Falls|St\. Catharines|Grimsby|Welland|Windsor|Sarnia|Peterborough|Kingston|Belleville|Collingwood|Vancouver|Burnaby|Surrey|Richmond|Coquitlam|Port Coquitlam|Port Moody|New Westminster|North Vancouver|West Vancouver|Langley|Abbotsford|Victoria|Kelowna|Nanaimo|Calgary|Edmonton|Airdrie|Cochrane|Okotoks|Leduc|St\. Albert|Sherwood Park|Red Deer)\b/;

function parseProjectPage(html: string): ParsedProject | null {
  const title =
    html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ??
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  if (!title) return null;
  const name = stripTags(title)
    .replace(/\s*[|–-]\s*UrbanToronto.*$/i, "")
    .trim();
  if (!name || name.length < 3) return null;

  const text = stripTags(html);
  const address = labelled(text, "Address");
  const developer =
    labelled(text, "Developer\\(s\\)") ?? labelled(text, "Developer");
  const storeysRaw = labelled(text, "Storeys") ?? text.match(/(\d{1,3})\s*storeys/i)?.[1] ?? null;
  const unitsRaw = labelled(text, "Units") ?? text.match(/(\d{2,4})\s*units/i)?.[1] ?? null;
  const status =
    labelled(text, "Status") ??
    (text.match(/\b(Pre-?Construction|Under Construction|Complete|Planning)\b/i)?.[1] ?? null);
  const city =
    (address?.match(CITY_RE)?.[1] ?? text.slice(0, 3000).match(CITY_RE)?.[1]) ?? null;

  const num = (v: string | null) => {
    const n = v ? parseInt(v.replace(/\D+/g, ""), 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  return {
    name,
    address: address ? address.slice(0, 200) : null,
    city,
    developer: developer ? developer.slice(0, 160) : null,
    storeys: num(storeysRaw),
    units: num(unitsRaw),
    status,
  };
}

/**
 * Sweep: read the database index, visit up to `maxPages` project pages we have
 * no signal for yet, and insert each as a discovery signal.
 * SkyriseCities (UrbanToronto's sister platform, same database structure)
 * covers Vancouver/BC — pass its index URL + sourceTag to sweep it.
 */
export async function sweepUrbanToronto(
  admin: Admin,
  opts: { indexUrl?: string; maxPages?: number; sourceTag?: string } = {},
): Promise<SweepSummary> {
  const notes: string[] = [];
  const indexUrl = opts.indexUrl ?? DEFAULT_INDEX;
  const maxPages = opts.maxPages ?? 6;
  const sourceTag = opts.sourceTag ?? "urbantoronto";

  const html = await fetchText(indexUrl);
  const links = projectLinks(html, indexUrl);
  notes.push(`${links.length} project links on index`);
  if (links.length === 0) {
    notes.push("no links matched — run probe mode and adjust the parser");
  }

  // Which of these have we already recorded? (URL match is cheap and precise.)
  const urls = links.map((l) => l.url);
  const { data: known } = urls.length
    ? await admin
        .from("discovery_signals")
        .select("source_url")
        .eq("source", sourceTag)
        .in("source_url", urls)
    : { data: [] as { source_url: string }[] };
  const knownSet = new Set(
    ((known ?? []) as { source_url: string }[]).map((k) => k.source_url),
  );
  const fresh = links.filter((l) => !knownSet.has(l.url)).slice(0, maxPages);

  let added = 0;
  for (const link of fresh) {
    try {
      const page = await fetchText(link.url);
      const parsed = parseProjectPage(page);
      if (!parsed) {
        notes.push(`unparseable: ${link.url}`);
        continue;
      }
      const { error } = await admin.from("discovery_signals").insert({
        source: sourceTag,
        source_url: link.url,
        project_name: parsed.name,
        builder_name: parsed.developer,
        address_full: parsed.address,
        address_norm: addressNorm(parsed.address),
        city: parsed.city,
        raw: {
          storeys: parsed.storeys,
          units: parsed.units,
          status: parsed.status,
        },
      });
      if (error) {
        // 23505 = the (source, name, city) dedup index — already seen via
        // another URL. Anything else is worth surfacing.
        if (!/duplicate key/i.test(error.message)) notes.push(error.message);
      } else {
        added++;
      }
    } catch (e) {
      notes.push(`${link.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    source: sourceTag,
    scanned: fresh.length,
    added,
    updated: 0,
    notes,
  };
}

/** SkyriseCities (Vancouver/BC) — same platform, different index. */
export const SKYRISE_INDEX = "https://skyrisecities.com/database/projects";

/** cityNorm re-export spot-used by the matcher for UT-city comparisons. */
export { cityNorm };
