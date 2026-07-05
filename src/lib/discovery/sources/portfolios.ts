import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { SweepSummary } from "./toronto";
import { upsertBuilder } from "./builders";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Portfolio sweeps — developer and ARCHITECT project portfolios as
 * name-signal sources. Architects are the earliest public signal there is:
 * a project appears on the architect's site at design stage, before any
 * marketing exists — exactly the "starting gun" the engine cross-references.
 *
 * Recency gate: architect portfolios showcase decades of work, so when an
 * entry carries a year older than the cutoff it's skipped — we want the
 * pipeline, not the retrospective. (Developer inventory pages are current by
 * nature and skip the gate.) Entries without a visible year still enter as
 * signals; the research pass + geography gate decide from there.
 *
 * Every site's markup differs — same probe-first discipline as everything:
 * defensive extraction (anchor text, headings, image alts), zero-match
 * self-reporting, and per-firm tuning via ?probe=1&source=<tag>.
 */

const UA = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml",
  "accept-language": "en-US,en;q=0.9",
};

export interface Portfolio {
  /** discovery_signals.source tag + runner param. */
  tag: string;
  firm: string;
  url: string;
  kind: "developer" | "architect";
  /** Developer's own site → builder registry (powers the hero floor too). */
  website?: string;
  /** Listing aggregator/marketplace (a SOURCE, not a builder) — its name must
   *  never be credited as the developer or appear anywhere public. */
  aggregator?: boolean;
}

export const PORTFOLIOS: Portfolio[] = [
  {
    tag: "relatedgroup",
    firm: "Related Group",
    url: "https://relatedgroup.com/luxury-condominium/",
    kind: "developer",
    website: "https://relatedgroup.com",
  },
  {
    tag: "pmg",
    firm: "Property Markets Group",
    url: "https://propertymg.com/portfolio?category=Luxury%20Condominiums",
    kind: "developer",
    website: "https://propertymg.com",
  },
  {
    tag: "naftali",
    firm: "Naftali Group",
    url: "https://naftaligroup.com/residential/",
    kind: "developer",
    website: "https://naftaligroup.com",
  },
  {
    tag: "kolter",
    firm: "Kolter Urban",
    url: "https://www.kolterurban.com/",
    kind: "developer",
    website: "https://www.kolterurban.com",
  },
  {
    tag: "arquitectonica",
    firm: "Arquitectonica",
    url: "https://arquitectonica.com/architecture/projects/?featured=true",
    kind: "architect",
  },
  {
    tag: "kobikarp",
    firm: "Kobi Karp",
    url: "https://www.kobikarp.com/featured-projects/",
    kind: "architect",
  },
  {
    tag: "kpf",
    firm: "Kohn Pedersen Fox",
    url: "https://www.kpf.com/projects/residential",
    kind: "architect",
  },
  {
    tag: "morrisadjmi",
    firm: "Morris Adjmi Architects",
    url: "https://ma.com/residential.html",
    kind: "architect",
  },
  {
    tag: "siegersuarez",
    firm: "Sieger Suarez Architects",
    url: "https://www.siegersuarez.com/projects",
    kind: "architect",
  },
  {
    tag: "arkfield",
    firm: "Arkfield",
    // High-rise + low-rise portfolio with addresses and stage per project —
    // mostly Planning & Approval, i.e. the earliest possible signal.
    url: "https://arkfield.com/portfolio/",
    kind: "developer",
    website: "https://arkfield.com",
  },
  // --- GTA aggregators (launch-market backfill; current inventory) ---
  // MyCondoPro's WP archive lists every GTA pre-con project newest-first
  // (detail links at /project/<slug>/). First pages carry the active tail;
  // the weekly rotation keeps catching new launches on page 1.
  {
    tag: "mycondopro",
    firm: "MyCondoPro (GTA aggregator)",
    url: "https://mycondopro.ca/project/",
    kind: "developer",
    aggregator: true,
  },
  {
    tag: "mycondopro2",
    firm: "MyCondoPro (GTA aggregator, p2)",
    url: "https://mycondopro.ca/project/page/2/",
    kind: "developer",
    aggregator: true,
  },
  {
    tag: "mycondopro3",
    firm: "MyCondoPro (GTA aggregator, p3)",
    url: "https://mycondopro.ca/project/page/3/",
    kind: "developer",
    aggregator: true,
  },
  {
    tag: "condoroyalty",
    firm: "Condo Royalty (GTA aggregator)",
    url: "https://www.condoroyalty.com/",
    kind: "developer",
    aggregator: true,
  },
  // --- "Most active" leaderboard expansion (probe-tunable URLs) ---
  {
    tag: "terra",
    firm: "Terra Group",
    url: "https://terragroup.com/",
    kind: "developer",
    website: "https://terragroup.com",
  },
  {
    tag: "jds",
    firm: "JDS Development Group",
    // The paginated portfolio (per-project detail links), not the homepage —
    // the homepage carries taglines and contact blocks that read as entries.
    url: "https://jdsdevelopment.com/portfolio?page=1",
    kind: "developer",
    website: "https://jdsdevelopment.com",
  },
  {
    tag: "tworoads",
    firm: "Two Roads Development",
    url: "https://tworoadsdev.com/portfolio/",
    kind: "developer",
    website: "https://tworoadsdev.com",
  },
  {
    tag: "continuum",
    firm: "Continuum Company",
    url: "https://continuumcompany.com/",
    kind: "developer",
    website: "https://continuumcompany.com",
  },
  {
    tag: "okogroup",
    firm: "OKO Group",
    url: "https://okogroup.com/projects",
    kind: "developer",
    website: "https://okogroup.com",
  },
  {
    tag: "mastcapital",
    firm: "Mast Capital",
    url: "https://mastcapital.com/portfolio",
    kind: "developer",
    website: "https://mastcapital.com",
  },
  {
    tag: "fortuneintl",
    firm: "Fortune International Group",
    url: "https://www.fortuneintlgroup.com/developments",
    kind: "developer",
    website: "https://www.fortuneintlgroup.com",
  },
  {
    tag: "witkoff",
    firm: "Witkoff",
    url: "https://www.witkoff.com/portfolio/",
    kind: "developer",
    website: "https://www.witkoff.com",
  },
  {
    tag: "ramsa",
    firm: "Robert A.M. Stern Architects",
    url: "https://www.ramsa.com/projects",
    kind: "architect",
  },
  {
    tag: "beharfont",
    firm: "Behar Font & Partners",
    url: "https://beharfont.com/projects/",
    kind: "architect",
  },
  {
    tag: "spinaorourke",
    firm: "Spina O'Rourke + Partners",
    url: "https://www.spinaorourke.com/portfolio",
    kind: "architect",
  },
  {
    tag: "garciastromberg",
    firm: "Garcia Stromberg",
    url: "https://garciastromberg.com/portfolio/",
    kind: "architect",
  },
  {
    tag: "carlosott",
    firm: "Carlos Ott",
    url: "https://carlosott.com/projects/",
    kind: "architect",
  },
];

/** Source tags whose builder_name must never be trusted (aggregators). */
export const AGGREGATOR_TAGS = new Set(
  PORTFOLIOS.filter((p) => p.aggregator).map((p) => p.tag),
);

/** Architect entries older than this many years are retrospective — skip. */
const ARCHITECT_MAX_AGE_YEARS = 3;

const NOISE_RE =
  /^(home|about( us)?|contact( us)?|team|people|news|press|careers?|career opportunities|awards?|menu|search|(investor )?login|privacy( (policy|notice))?|terms( (and|&) conditions| of (use|service))?|conditions|cookies? policy|legal( & privacy policy)?|accessibility statement|notices?|projects?|current projects|portfolio( (timeline|highlights|selects))?|residential|luxury residential|commercial|hospitality|high-end hospitality|mixed[\s-]?use|luxury condominiums?|condominiums?|condominium hotels?|all|filter|next|prev(ious)?|back|view (all|more|our)( \w+)?|read more|learn (more|about us)|explore( tags)?|discover( more)?|see all \w+|follow us|category|architecture|interiors?|planning|share|instagram|facebook|linkedin(-in)?|twitter( logo)?|investors?|affiliates|brokerage|broker tools|capabilities|vision(ar(y|ies))?|community|master plan community|affordable housing|overview|company overview|newsroom|magazine|map|videos?|films?|art|international|foundation|philanthropy|collaboration|landmark|profile|properties|shop|main navigation|select site|site ?map|(main|field|corporate) offices?|safety protocols?|(live )?construction cams?|floor ?plans?|gallery|brochures?|register( now)?|amenities|features|availability|location|neighbou?rhoods?|virtual tours?|schedule a (visit|tour)|book (a )?(visit|tour)|active sales|now selling|coming soon|sold out|new construction|pre-?sales?|waterfront|development partners?|leadership|who we are|our (team|story|people|company|vision|culture|collaborators)|insights?|supertall|rentals?|luxury rentals?|villa|penthouses?|residences|get in touch|request info(rmation)?|real estate( development)?|investment approach|capital partnerships?|marketing and sales|design (excellence|forecast)|design for equity|future of \w+|city centers?|research library|skyline disruptors|lifestyle experiences|work & the workplace|workplace surveys?|sustainability( & resilience)?|resilience by design|vision & impacts?|cnbc|forbes|bloomberg|reuters)$/i;

/** Never a for-sale/rental housing project — architect portfolios are full
 *  of stadiums and campuses; builder sites are full of people and slogans. */
const NONRESIDENTIAL_RE =
  /\b(stadium|arena|convention (center|centre)|cruise|terminal|universit(y|ies)|college|student housing|administration|city hall|civic|courthouse|museum|librar(y|ies)|airport|hospital|medical|clinic|school|campus|office (tower|building|park)|parking|garage|warehouse|logistics|data (center|centre)|church|temple|mosque|automotive|auto haus|government (center|centre))\b/i;
const PERSONISH_RE =
  /\b(president|principal|founder|ceo|coo|cfo|managing partner|director|chairman|broker of record)\b/i;

/**
 * Why a candidate name can never become a project — or null when it's fine.
 * Used at parse time AND at ignition (paste-lists and pre-hardening signals
 * bypass the parser), so a slogan/email/person can't reach a research pass.
 */
export function junkProjectName(name: string): string | null {
  const n = name.trim();
  if (!n || n.length < 3 || n.length > 80) return "length";
  if (n.includes("@")) return "email address";
  if (/^(www\.|https?:)/i.test(n) || /\.(com|ca|net|org|io)\b/i.test(n)) {
    return "web address";
  }
  if (/^[a-z]/.test(n)) return "lowercase start (nav text or spam)";
  if (/&[a-z]+;|&#\d+;/i.test(n)) return "undecoded HTML entity";
  if (/[|>»→]/.test(n)) return "menu/category text";
  if (/^["'“”‘’]|["'“”‘’]$/.test(n)) return "quoted tagline";
  if (/[.!?]["'”’]?$/.test(n) && !/\b(inc|ltd|co|jr|sr|st)\.$/i.test(n)) {
    return "reads as a sentence";
  }
  // "St. Regis", "Mr. C Residences", "Mt. Pleasant" are names, not sentences.
  const noAbbrev = n.replace(/\b(st|ft|mt|dr|no|ste|mr|mrs|ms)\.\s/gi, "");
  if (/\.\s+[A-Z]/.test(noAbbrev)) return "multi-sentence tagline";
  // "$7.5 Billion" / "15 Million" / "31M" / "40 Years" — stat blocks.
  if (
    /^[$€£]?[\d,.]+\s*(billion|million|thousand|acres?|years?|units?|homes?|sf|sq\.?\s?ft\.?|[bmk]n?\+?)?\+?$/i.test(
      n,
    )
  ) {
    return "stat, not a name";
  }
  // "About 02" / "Newsroom 05" — numbered page sections.
  if (
    /^(about|home|overview|services?|newsroom|portfolio|investments?|profile|contact|projects?|properties)\s+\d{1,2}$/i.test(
      n,
    )
  ) {
    return "numbered page section";
  }
  // "Naftali Credit Partners", "Continuum Company", "New York Magazine" —
  // firms and press, not developments.
  if (
    /\b(group|holdings?|capital|partners?|partnerships?|compan(y|ies)|ventures?|equities|investments?|credit|corp\.?|corporation|corporate|inc\.?|llc|realty|magazine|firms?|offices?|blog|proposals?|login|polic(y|ies)|notices?|statements?|logos?)$/i.test(
      n,
    )
  ) {
    return "company/media name, not a project";
  }
  // "We are …", "Our Vision", "Meet the Visionaries", "Discover our …".
  if (
    /^(we are|our|more about|meet|why|join|discover|explore|follow|view|see|learn|read|welcome|home)\b/i.test(
      n,
    )
  ) {
    return "marketing copy";
  }
  // "Miami Beach, Florida" / "Coral Gables, Florida 33146" — location headers.
  if (
    /^[A-Za-z .'-]+,\s*(Florida|California|New York|Georgia|Texas|Tennessee|Ontario|British Columbia|Alberta|[A-Z]{2})(\s+\d{5})?$/.test(
      n,
    )
  ) {
    return "location header, not a name";
  }
  // Aggregators list assignment resales alongside new inventory — an
  // assignment is a resold pre-con contract, not a new development.
  if (/\bassignments?\b/i.test(n)) return "assignment resale, not a new development";
  if (/:/.test(n)) return "editorial title";
  if (NOISE_RE.test(n)) return "navigation label";
  if (NONRESIDENTIAL_RE.test(n)) return "non-residential";
  if (PERSONISH_RE.test(n)) return "person/title";
  if (n.split(/\s+/).length > 8) return "too long to be a name";
  return null;
}

const CITY_RE =
  /\b(Miami Beach|Sunny Isles Beach|Bal Harbour|Coral Gables|Coconut Grove|Aventura|Hallandale|Hollywood|Fort Lauderdale|Pompano Beach|Boca Raton|Delray Beach|West Palm Beach|Palm Beach|Naples|Sarasota|Tampa|St\.? Petersburg|Orlando|Jacksonville|Miami|New York|Brooklyn|Manhattan|Los Angeles|San Francisco|Austin|Dallas|Houston|San Antonio|Nashville|Mississauga|Oakville|Burlington|Hamilton|Brampton|Vaughan|Markham|Richmond Hill|Ajax|Pickering|Whitby|Oshawa|Milton|Newmarket|Aurora|Barrie|Kitchener|Waterloo|Cambridge|Guelph|London|Niagara Falls|St\.? Catharines|Etobicoke|Scarborough|North York|Caledon|King City|Stouffville|Innisfil|Windsor|Ottawa|Toronto|Vancouver|Burnaby|Surrey|Calgary|Edmonton|Chicago|Boston|Seattle|Denver|Phoenix|Las Vegas|Washington)\b/;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&#8217;|&rsquo;|&lsquo;|&#8216;/g, "'")
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#822[01];|&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&hellip;/g, "…")
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    // Any remaining numeric entity — decode rather than publish "&#8211;".
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, timeoutMs = 20_000): Promise<string> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${url.slice(0, 120)}`);
  return await res.text();
}

export interface PortfolioEntry {
  name: string;
  url: string | null;
  city: string | null;
  year: number | null;
}

function plausibleName(text: string): boolean {
  if (!/[A-Za-z]/.test(text)) return false;
  return junkProjectName(text) == null;
}

/**
 * Extracts candidate project entries from a portfolio index. Three passes:
 * same-host anchors with text, anchors whose imagery carries an alt, and
 * standalone headings. City + year come from the entry's surrounding text.
 */
export function parsePortfolio(html: string, baseUrl: string): PortfolioEntry[] {
  const host = new URL(baseUrl).hostname;
  const found = new Map<string, PortfolioEntry>();

  const push = (rawName: string, href: string | null, context: string) => {
    let name = stripTags(rawName);
    if (!plausibleName(name)) return;
    const ctx = stripTags(context).slice(0, 400);
    const year = ctx.match(/\b(19[89]\d|20[0-4]\d)\b/);
    const city = name.match(CITY_RE)?.[1] ?? ctx.match(CITY_RE)?.[1] ?? null;
    // Tile captions often append the location to the name ("1000 Boulevard of
    // the Arts Sarasota, FL") — strip a trailing "City[, ST]" so the same
    // project dedups against its clean-named siblings.
    if (city) {
      name = name
        .replace(
          new RegExp(`[\\s,·|–-]*${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(,?\\s*[A-Z]{2})?\\s*$`, "i"),
          "",
        )
        .trim();
      if (!plausibleName(name)) return;
    }
    // SHOUTING tiles ("1000 BOULEVARD OF THE ARTS") → title case.
    if (name === name.toUpperCase() && /[A-Z]{4,}/.test(name)) {
      name = name
        .toLowerCase()
        .replace(/\b[a-z]/g, (c) => c.toUpperCase())
        .replace(/\b(Of|The|At|On|And|In)\b/g, (w) => w.toLowerCase())
        .replace(/^[a-z]/, (c) => c.toUpperCase());
    }
    const key = name.toLowerCase();
    if (found.has(key)) return;
    let url: string | null = null;
    if (href) {
      try {
        const u = new URL(href, baseUrl);
        if (u.hostname === host) url = u.toString();
      } catch {
        /* not a URL */
      }
    }
    found.set(key, { name, url, city, year: year ? parseInt(year[1], 10) : null });
  };

  // Anchors: visible text, else the image alt inside.
  const anchorRe = /<a[^>]+href="([^"#]+)"[^>]*>([\s\S]{0,600}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const inner = m[2];
    const text = stripTags(inner);
    if (text) {
      push(text, m[1], inner);
    } else {
      const alt = inner.match(/<img[^>]+alt="([^"]{3,70})"/i)?.[1];
      if (alt) push(alt, m[1], inner);
    }
  }
  // Headings (some portfolios render tiles without links).
  const hRe = /<h[1-5][^>]*>([\s\S]{0,200}?)<\/h[1-5]>/gi;
  while ((m = hRe.exec(html))) {
    push(m[1], null, m[1]);
  }

  return [...found.values()];
}

export async function probePortfolio(tag?: string, url?: string): Promise<unknown> {
  const pf = PORTFOLIOS.find((p) => p.tag === tag) ?? PORTFOLIOS[0];
  const html = await fetchText(url ?? pf.url);
  const entries = parsePortfolio(html, url ?? pf.url);
  return {
    firm: pf.firm,
    url: url ?? pf.url,
    bytes: html.length,
    entries_found: entries.length,
    entries: entries.slice(0, 25),
  };
}

export async function sweepPortfolio(
  admin: Admin,
  pf: Portfolio,
): Promise<SweepSummary> {
  const notes: string[] = [];
  const html = await fetchText(pf.url);
  const entries = parsePortfolio(html, pf.url);
  notes.push(`${entries.length} candidate entries on page`);
  if (entries.length === 0) {
    notes.push("no entries matched — run probe mode and adjust the parser");
  }

  // Developer firms join the builder registry (name cross-referencing at
  // ignition + the builder-site hero floor).
  if (pf.kind === "developer" && pf.website && !pf.aggregator) {
    await upsertBuilder(admin, pf.firm, `portfolio_${pf.tag}`, pf.website);
  }

  const cutoff = new Date().getUTCFullYear() - ARCHITECT_MAX_AGE_YEARS;
  let skippedOld = 0;
  let added = 0;
  for (const e of entries) {
    // Recency gate: an architect entry with a visible old year is a
    // retrospective piece, not pipeline.
    if (pf.kind === "architect" && e.year && e.year < cutoff) {
      skippedOld++;
      continue;
    }
    const { error } = await admin.from("discovery_signals").insert({
      source: pf.tag,
      source_url: e.url ?? pf.url,
      project_name: e.name,
      // Aggregators are sources, not builders — research finds the real one.
      builder_name: pf.kind === "developer" && !pf.aggregator ? pf.firm : null,
      city: e.city,
      raw: {
        portfolio: pf.kind,
        firm: pf.firm,
        year: e.year,
      },
    });
    if (error) {
      // 23505 = (source, name, city) dedup — already recorded.
      if (!/duplicate key/i.test(error.message)) notes.push(error.message);
    } else {
      added++;
    }
  }
  if (skippedOld > 0) notes.push(`${skippedOld} skipped as pre-${cutoff} work`);

  return { source: pf.tag, scanned: entries.length, added, updated: 0, notes };
}

/**
 * Registry-driven builder-site sweep — the 434-and-growing builder registry
 * as a project source. Rotates through builders that have a website
 * (least-recently-swept first, stamped via last_swept_at), parses each site
 * with the portfolio extractor, and files entries as name signals credited
 * to that builder. Every website the enrichment pass finds automatically
 * joins this rotation.
 */
export async function sweepBuilderSites(
  admin: Admin,
  limit = 15,
): Promise<SweepSummary> {
  const notes: string[] = [];
  const { data } = await admin
    .from("discovery_builders")
    .select("id, name, website")
    .not("website", "is", null)
    .order("last_swept_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  const rows = (data ?? []) as { id: string; name: string; website: string }[];

  let added = 0;
  for (const b of rows) {
    try {
      const html = await fetchText(b.website);
      const entries = parsePortfolio(html, b.website).slice(0, 15);
      let ok = 0;
      for (const e of entries) {
        const { error } = await admin.from("discovery_signals").insert({
          source: "builder_site",
          source_url: e.url ?? b.website,
          project_name: e.name,
          builder_name: b.name,
          city: e.city,
          raw: { portfolio: "builder_site", firm: b.name, year: e.year },
        });
        if (!error) {
          ok++;
          added++;
        } else if (!/duplicate key/i.test(error.message)) {
          notes.push(`${b.name}: ${error.message}`);
        }
      }
      if (ok > 0) notes.push(`${b.name}: +${ok}`);
    } catch (e) {
      notes.push(`${b.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    await admin
      .from("discovery_builders")
      .update({ last_swept_at: new Date().toISOString() })
      .eq("id", b.id);
  }

  return {
    source: "builder_sites",
    scanned: rows.length,
    added,
    updated: 0,
    notes: notes.slice(0, 25),
  };
}

/** Sweep every configured portfolio (weekly cron leg + "portfolios"). */
export async function sweepAllPortfolios(admin: Admin): Promise<SweepSummary[]> {
  const out: SweepSummary[] = [];
  for (const pf of PORTFOLIOS) {
    out.push(
      await sweepPortfolio(admin, pf).catch((e) => ({
        source: pf.tag,
        scanned: 0,
        added: 0,
        updated: 0,
        notes: [`ERROR: ${e instanceof Error ? e.message : String(e)}`],
      })),
    );
  }
  return out;
}
