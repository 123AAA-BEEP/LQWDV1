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
    url: "https://jdsdevelopment.com/",
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

/** Architect entries older than this many years are retrospective — skip. */
const ARCHITECT_MAX_AGE_YEARS = 3;

const NOISE_RE =
  /^(home|about|contact|team|people|news|press|careers?|awards?|menu|search|login|privacy|terms|projects?|portfolio|residential|commercial|hospitality|mixed[\s-]?use|luxury condominiums?|condominiums?|all|filter|next|prev(ious)?|back|view (all|more)|read more|learn more|explore|category|architecture|interiors?|planning|share|instagram|facebook|linkedin|twitter)$/i;

const CITY_RE =
  /\b(Miami Beach|Sunny Isles Beach|Bal Harbour|Coral Gables|Coconut Grove|Aventura|Hallandale|Hollywood|Fort Lauderdale|Pompano Beach|Boca Raton|Delray Beach|West Palm Beach|Palm Beach|Naples|Sarasota|Tampa|St\.? Petersburg|Orlando|Jacksonville|Miami|New York|Brooklyn|Manhattan|Los Angeles|San Francisco|Austin|Dallas|Houston|San Antonio|Nashville|Toronto|Vancouver|Calgary|Edmonton|Chicago|Boston|Seattle|Denver|Phoenix|Las Vegas|Washington)\b/;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;|&apos;|&#8217;/g, "'")
    .replace(/&nbsp;/g, " ")
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
  if (!text || text.length < 3 || text.length > 70) return false;
  if (NOISE_RE.test(text.trim())) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  // Nav fragments and sentences aren't project names.
  if (text.split(/\s+/).length > 8) return false;
  if (/[.!?]$/.test(text.trim())) return false;
  return true;
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
    const name = stripTags(rawName);
    if (!plausibleName(name)) return;
    const key = name.toLowerCase();
    if (found.has(key)) return;
    const ctx = stripTags(context).slice(0, 400);
    const year = ctx.match(/\b(19[89]\d|20[0-4]\d)\b/);
    const city = name.match(CITY_RE)?.[1] ?? ctx.match(CITY_RE)?.[1] ?? null;
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
  if (pf.kind === "developer" && pf.website) {
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
      builder_name: pf.kind === "developer" ? pf.firm : null,
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
