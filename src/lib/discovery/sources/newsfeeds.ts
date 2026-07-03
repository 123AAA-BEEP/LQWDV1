import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addressNorm } from "../normalize";
import type { SweepSummary } from "./toronto";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Development-news feeds — the UrbanToronto-equivalents for our US + Alberta
 * markets. Each is a news site whose headlines carry the "starting gun"
 * signal: a project name (sometimes an address) the moment marketing begins.
 *
 *   - The Next Miami / Florida YIMBY   (WordPress → /feed/ RSS)
 *   - Urbanize LA                       (Drupal → /rss.xml)
 *   - UrbanPlanet Nashville             (forum index — topic titles carry
 *                                        name + storeys + units)
 *
 * Headlines are noisy, so extraction is deliberately conservative: an item
 * only becomes a signal when a project-ish proper name can be pulled from the
 * title. Low-confidence names are fine — ignition forces a web-research pass
 * that resolves the real name/city/address or reports found=false.
 */

// Some WordPress hosts (Wordfence/Cloudflare) 401 anything that self-identifies
// as a bot, even on their public RSS feed — so present as a normal browser.
const UA = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept:
    "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, text/html;q=0.7, */*;q=0.5",
  "accept-language": "en-US,en;q=0.9",
};

async function fetchText(url: string, timeoutMs = 15_000): Promise<string> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${url.slice(0, 120)}`);
  return await res.text();
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#822[01];|&quot;/g, '"')
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface FeedItem {
  title: string;
  link: string;
}

/** Minimal RSS/Atom item parser — no deps, tolerant of both formats. */
export function parseFeedItems(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  // RSS 2.0: <item><title>…</title><link>…</link>
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const chunk = m[1];
    const title = chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link = chunk
      .match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]
      ?.replace(/<!\[CDATA\[|\]\]>/g, "")
      .trim();
    if (title && link) out.push({ title: decodeEntities(title), link });
  }
  if (out.length > 0) return out;
  // Atom: <entry><title>…</title><link href="…"/>
  const entryRe = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  while ((m = entryRe.exec(xml))) {
    const chunk = m[1];
    const title = chunk.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const link = chunk.match(/<link[^>]+href="([^"]+)"/i)?.[1];
    if (title && link) out.push({ title: decodeEntities(title), link });
  }
  return out;
}

interface NewsFeed {
  /** discovery_signals.source tag */
  tag: string;
  url: string;
  /** City assumed when the headline doesn't name one. */
  defaultCity: string | null;
  /** Cities this feed can name (matched in the headline). */
  cityRe: RegExp;
  /** Neighbourhood → city collapses (Brickell → Miami, DTLA → Los Angeles). */
  hoods?: Record<string, string>;
}

const FL_CITY_RE =
  /\b(Miami Beach|North Miami|Sunny Isles Beach|Bal Harbour|Coral Gables|Aventura|Hallandale Beach|Dania Beach|Pompano Beach|Deerfield Beach|Boca Raton|Delray Beach|West Palm Beach|Palm Beach Gardens|Fort Lauderdale|Hollywood|Doral|Hialeah|Homestead|Naples|Fort Myers|Sarasota|St\.? Petersburg|Tampa|Clearwater|Orlando|Kissimmee|Jacksonville|Miami)\b/;

const FL_HOODS: Record<string, string> = {
  Brickell: "Miami",
  Edgewater: "Miami",
  Wynwood: "Miami",
  "Design District": "Miami",
  "Little River": "Miami",
  "Coconut Grove": "Miami",
  "Miami Worldcenter": "Miami",
  "Downtown Miami": "Miami",
};

const LA_CITY_RE =
  /\b(Los Angeles|Santa Monica|Culver City|West Hollywood|Beverly Hills|Long Beach|Pasadena|Glendale|Burbank|Inglewood|Marina del Rey|El Segundo|Torrance|Anaheim|Irvine|Koreatown|Hollywood|Downtown)\b/;

const LA_HOODS: Record<string, string> = {
  Koreatown: "Los Angeles",
  Hollywood: "Los Angeles",
  Downtown: "Los Angeles",
  "Century City": "Los Angeles",
  Westwood: "Los Angeles",
  "Boyle Heights": "Los Angeles",
};

export const NEWS_FEEDS: NewsFeed[] = [
  {
    tag: "thenextmiami",
    url: "https://www.thenextmiami.com/feed/",
    defaultCity: "Miami",
    cityRe: FL_CITY_RE,
    hoods: FL_HOODS,
  },
  {
    tag: "floridayimby",
    url: "https://floridayimby.com/feed/",
    defaultCity: null, // statewide — require a city match in the headline
    cityRe: FL_CITY_RE,
    hoods: FL_HOODS,
  },
  {
    tag: "urbanizela",
    url: "https://la.urbanize.city/rss.xml",
    defaultCity: "Los Angeles",
    cityRe: LA_CITY_RE,
    hoods: LA_HOODS,
  },
];

/** Headlines must look like a development story at all. */
const BUILD_RE =
  /(tower|condo|residence|apartment|rental|mixed[\s-]?use|stor(?:y|ey|ies)|units|development|construction|breaks? ground|tops? (?:off|out)|approved|proposed|planned|revealed|launch|presale|groundbreaking|high[\s-]?rise)/i;

/** Building-name keywords a proper name can end with. */
const NAME_TAIL =
  "Residences|Residence|Tower|Towers|Condos|Condominiums?|Apartments|Lofts|House|Houses|Villas|Yards|Landing|Pointe?|Plaza|Place|Park|Square|Village|District|Collection|Estates|Club|Hotel";

export interface ParsedHeadline {
  name: string | null;
  address: string | null;
  city: string | null;
  storeys: number | null;
}

/**
 * A "name" that is really headline verbiage ("Tower Proposed", "New
 * Apartments") must not become a signal — it would burn a research pass on
 * nothing. Generic-word-only names and verb-bearing captures are rejected.
 */
const NAME_JUNK_RE =
  /\b(propos\w*|plann\w*|approv\w*|reveal\w*|construct\w*|develop\w*|breaks?|ground|tops?|off|out|launch\w*|update\w*|milestone|permit\w*|filed?|predictions?|discussion|thread|general|new|report\w*|reach\w*|level\w*|unveil\w*|residential|begins?|starts?|completes?|opens?|sell(?:s|ing)?)\b/i;
const NAME_GENERIC_ONLY_RE = new RegExp(
  `^(?:(?:${NAME_TAIL}|of|the|at|on|in|&|and)\\s*)+$`,
  "i",
);

function sanitizeName(name: string | null): string | null {
  if (!name) return null;
  const n = name.replace(/\s+/g, " ").replace(/[.,;:]+$/, "").trim();
  if (n.length < 3 || n.length > 80) return null;
  if (NAME_JUNK_RE.test(n)) return null;
  if (NAME_GENERIC_ONLY_RE.test(n)) return null;
  return n;
}

export function parseHeadline(title: string, feed: NewsFeed): ParsedHeadline {
  const storeys =
    title.match(/(\d{1,3})[\s-]stor(?:y|ey|ies)/i)?.[1] ?? null;

  // Address: "at/on 1550 Biscayne Boulevard". Whole-word street tokens only
  // (case-sensitive) so "21 story Parkway" can't false-match via "…ark|Way".
  const address =
    title.match(
      /\b(?:[Aa]t|[Oo]n)\s+(\d{2,6}(?:\s?[-–]\s?\d{2,6})?\s+(?:[A-Z][\w.']*\s+)*?(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Terrace|Court|Ct|Place|Pl|Lane|Ln|Highway|Hwy|Parkway|Pkwy|Broadway)\b\.?)/,
    )?.[1] ?? null;

  // Name attempt 1: a quoted name — 'Name' or "Name"
  let name = sanitizeName(
    title.match(/['"‘“]([A-Z][^'"’”]{2,60})['"’”]/)?.[1] ?? null,
  );

  // Name attempt 2: Proper Noun run ending in a building keyword.
  // "80-Story" prefixes are stripped first so "Story" can't lead a name.
  if (!name) {
    const t2 = title.replace(/\d{1,3}[\s-]stor(?:y|ey|ies)[\s-]*/gi, "");
    const re = new RegExp(
      `\\b((?:(?:[A-Z][\\w'&.-]*|of|the|at|on|&)\\s+){0,5}(?:${NAME_TAIL}))\\b`,
    );
    const m = t2.match(re);
    if (m) {
      // Trim headline filler off the front ("Developer Unveils Sunset Villas"
      // → "Sunset Villas") before judging the remainder.
      const words = m[1].trim().split(/\s+/);
      while (
        words.length > 1 &&
        (NAME_JUNK_RE.test(words[0]) ||
          /^(?:of|the|at|on|in|&|and)$/i.test(words[0]))
      ) {
        words.shift();
      }
      // Must contain at least one word beyond the keyword itself.
      if (words.length >= 2) name = sanitizeName(words.join(" "));
    }
  }

  // Name attempt 3: "N-Story <Name>" (e.g. "80-Story Cipriani Residences Miami")
  if (!name) {
    const m = title.match(
      /\d{1,3}[\s-]stor(?:y|ey)\s+((?:[A-Z][\w'&.-]*\s*){2,6})/,
    );
    if (m) name = sanitizeName(m[1].replace(/\s+(?:in|at|on|near)$/i, ""));
  }

  // City: explicit in the headline beats the feed default.
  let city: string | null = null;
  for (const [hood, c] of Object.entries(feed.hoods ?? {})) {
    if (title.includes(hood)) {
      city = c;
      break;
    }
  }
  if (!city) city = title.match(feed.cityRe)?.[1] ?? null;
  if (city && feed.hoods?.[city]) city = feed.hoods[city];
  if (!city) city = feed.defaultCity;

  return {
    name,
    address,
    city,
    storeys: storeys ? parseInt(storeys, 10) : null,
  };
}

/** Google News RSS scoped to the site — works even when the origin blocks
 *  datacenter IPs outright. Titles arrive as "Headline - Site Name". */
function googleNewsUrl(feedUrl: string): string {
  const host = new URL(feedUrl).hostname.replace(/^www\./, "");
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`site:${host} when:14d`)}&hl=en-US&gl=US&ceid=US:en`;
}

/**
 * Fetch a feed with fallbacks: direct URL → WordPress `?feed=rss2` variant →
 * Google News site query. Returns the items plus which route worked.
 */
async function fetchFeedItems(
  feedUrl: string,
): Promise<{ items: FeedItem[]; via: string }> {
  const attempts: { url: string; via: string; stripSource?: boolean }[] = [
    { url: feedUrl, via: "direct" },
  ];
  if (/\/feed\/?$/.test(feedUrl)) {
    attempts.push({
      url: feedUrl.replace(/\/feed\/?$/, "/?feed=rss2"),
      via: "rss2-param",
    });
  }
  attempts.push({
    url: googleNewsUrl(feedUrl),
    via: "google-news",
    stripSource: true,
  });

  let lastError = "no attempts";
  for (const attempt of attempts) {
    try {
      const xml = await fetchText(attempt.url);
      let items = parseFeedItems(xml);
      if (items.length === 0) {
        lastError = `${attempt.via}: 0 items parsed`;
        continue;
      }
      if (attempt.stripSource) {
        // "Headline - The Next Miami" → "Headline"
        items = items.map((i) => ({
          ...i,
          title: i.title.replace(/\s+-\s+[^-]{2,40}$/, ""),
        }));
      }
      return { items, via: attempt.via };
    } catch (e) {
      lastError = `${attempt.via}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  throw new Error(lastError);
}

export async function probeNewsFeed(tag?: string, url?: string): Promise<unknown> {
  const feed = NEWS_FEEDS.find((f) => f.tag === tag) ?? NEWS_FEEDS[0];
  const { items, via } = await fetchFeedItems(url ?? feed.url);
  return {
    feed: feed.tag,
    url: url ?? feed.url,
    via,
    items_found: items.length,
    parsed: items.slice(0, 10).map((i) => ({
      title: i.title,
      link: i.link,
      extraction: parseHeadline(i.title, feed),
    })),
  };
}

async function insertSignal(
  admin: Admin,
  row: {
    source: string;
    source_url: string;
    project_name: string;
    address_full: string | null;
    city: string | null;
    raw: Record<string, unknown>;
  },
  notes: string[],
): Promise<boolean> {
  const { error } = await admin.from("discovery_signals").insert({
    ...row,
    address_norm: addressNorm(row.address_full),
  });
  if (error) {
    // 23505 = the (source, name, city) dedup index — already recorded.
    if (!/duplicate key/i.test(error.message)) notes.push(error.message);
    return false;
  }
  return true;
}

/** Sweep one configured news feed into discovery_signals. */
export async function sweepNewsFeed(
  admin: Admin,
  feed: NewsFeed,
): Promise<SweepSummary> {
  const notes: string[] = [];
  const { items, via } = await fetchFeedItems(feed.url);
  notes.push(`${items.length} items in feed (via ${via})`);

  // Skip links we've already recorded (cheap precise dedup before parsing).
  const urls = items.map((i) => i.link);
  const { data: known } = urls.length
    ? await admin
        .from("discovery_signals")
        .select("source_url")
        .eq("source", feed.tag)
        .in("source_url", urls)
    : { data: [] as { source_url: string }[] };
  const knownSet = new Set(
    ((known ?? []) as { source_url: string }[]).map((k) => k.source_url),
  );

  let added = 0;
  let scanned = 0;
  for (const item of items) {
    if (knownSet.has(item.link)) continue;
    scanned++;
    if (!BUILD_RE.test(item.title)) continue;
    const parsed = parseHeadline(item.title, feed);
    // Conservative: a signal needs a name AND a city (research verifies both).
    if (!parsed.name || !parsed.city) continue;
    const ok = await insertSignal(
      admin,
      {
        source: feed.tag,
        source_url: item.link,
        project_name: parsed.name,
        address_full: parsed.address,
        city: parsed.city,
        raw: { title: item.title, storeys: parsed.storeys },
      },
      notes,
    );
    if (ok) added++;
  }

  return { source: feed.tag, scanned, added, updated: 0, notes };
}

/** Sweep every configured news feed (used by cron + the "all" runner). */
export async function sweepAllNewsFeeds(admin: Admin): Promise<SweepSummary[]> {
  const out: SweepSummary[] = [];
  for (const feed of NEWS_FEEDS) {
    out.push(
      await sweepNewsFeed(admin, feed).catch((e) => ({
        source: feed.tag,
        scanned: 0,
        added: 0,
        updated: 0,
        notes: [`ERROR: ${e instanceof Error ? e.message : String(e)}`],
      })),
    );
  }
  return out;
}

/* ------------------------------------------------------------------------ *
 * UrbanPlanet Nashville — forum index sweep. Topic titles are dense with
 * data: "505 CST (505 Church St, 45 floors, 550 units)". The Nashville board
 * is the UrbanToronto of Tennessee.
 * ------------------------------------------------------------------------ */

const URBANPLANET_INDEX = "https://forum.urbanplanet.org/forum/250-nashville/";

function topicLinks(html: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();
  const re =
    /<a[^>]+href="(https?:\/\/forum\.urbanplanet\.org\/topic\/\d+[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = m[1];
    const title = decodeEntities(m[2]);
    if (seen.has(url) || !title || title.length < 6) continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

export interface ParsedTopic {
  name: string;
  address: string | null;
  storeys: number | null;
  units: number | null;
}

/** "Name (address, N floors/stories, M units …)" → structured signal. */
export function parseUrbanPlanetTitle(title: string): ParsedTopic | null {
  const prefix = title.split("(")[0];
  const name = sanitizeName(prefix.trim().replace(/[|–-]\s*$/, ""));
  if (!name) return null;
  const details = title.slice(prefix.length);

  const storeys =
    details.match(/(\d{1,3})\s*(?:floors?|stor(?:y|ies|eys?))/i)?.[1] ?? null;
  const units =
    details.match(/(\d{2,4})\s*(?:total\s+)?(?:residential\s+)?units/i)?.[1] ??
    null;
  const address =
    details.match(
      /(\d{2,6}\s+(?:[A-Z][\w.']*\s+)*?(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Way|Pike|Court|Ct|Place|Pl|Lane|Ln|Parkway|Pkwy|Broadway)\b\.?)/,
    )?.[1] ?? null;

  // Project topics carry scale details; discussion threads ("Predictions for
  // 2026") don't. Require at least one hard datum.
  if (!storeys && !units && !address) return null;

  return {
    name,
    address,
    storeys: storeys ? parseInt(storeys, 10) : null,
    units: units ? parseInt(units, 10) : null,
  };
}

export async function probeUrbanPlanet(url?: string): Promise<unknown> {
  const target = url ?? URBANPLANET_INDEX;
  const html = await fetchText(target);
  const topics = topicLinks(html);
  return {
    url: target,
    bytes: html.length,
    topics_found: topics.length,
    parsed: topics.slice(0, 12).map((t) => ({
      title: t.title,
      extraction: parseUrbanPlanetTitle(t.title),
    })),
  };
}

export async function sweepUrbanPlanet(admin: Admin): Promise<SweepSummary> {
  const notes: string[] = [];
  const html = await fetchText(URBANPLANET_INDEX);
  const topics = topicLinks(html);
  notes.push(`${topics.length} topic links on index`);
  if (topics.length === 0) {
    notes.push("no topics matched — run probe mode and adjust the parser");
  }

  const urls = topics.map((t) => t.url);
  const { data: known } = urls.length
    ? await admin
        .from("discovery_signals")
        .select("source_url")
        .eq("source", "urbanplanet_nashville")
        .in("source_url", urls)
    : { data: [] as { source_url: string }[] };
  const knownSet = new Set(
    ((known ?? []) as { source_url: string }[]).map((k) => k.source_url),
  );

  let added = 0;
  let scanned = 0;
  for (const topic of topics) {
    if (knownSet.has(topic.url)) continue;
    scanned++;
    const parsed = parseUrbanPlanetTitle(topic.title);
    if (!parsed) continue;
    const ok = await insertSignal(
      admin,
      {
        source: "urbanplanet_nashville",
        source_url: topic.url,
        project_name: parsed.name,
        address_full: parsed.address,
        city: "Nashville",
        raw: {
          title: topic.title,
          storeys: parsed.storeys,
          units: parsed.units,
        },
      },
      notes,
    );
    if (ok) added++;
  }

  return { source: "urbanplanet_nashville", scanned, added, updated: 0, notes };
}
