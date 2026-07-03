import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { builderNorm } from "../normalize";
import type { SweepSummary } from "./toronto";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Builder registry feeds.
 *
 * 1. `seedBuildersFromProjects` — the free, instant one: every distinct
 *    builder_name already in our 1,100+ projects becomes a registry row.
 * 2. `sweepBild` — a home-builder association member directory. BILD
 *    (bildgta.ca) is the GTA original; BUILDER_DIRECTORIES lists its
 *    equivalent in every market (state/metro HBAs), all parsed with the same
 *    defensive heuristics + probe mode. The registry powers builder-name
 *    cross-referencing at ignition AND the builder-site hero floor.
 */
const UA = {
  "user-agent":
    "Mozilla/5.0 (compatible; LIQWD-discovery/1.0; +https://liqwd.ca)",
  accept: "text/html,application/xhtml+xml",
};

const DEFAULT_BILD_URL = "https://bildgta.ca/member-directory/";

export interface BuilderDirectory {
  /** discovery_builders.source tag + runner param. */
  tag: string;
  label: string;
  url: string;
}

/**
 * The BILD-equivalents: state/metro home-builder association member
 * directories across every market. URLs follow the common association-site
 * convention and are probe-tunable (`?probe=1&source=bild&url=…`) — a miss
 * just reports "nothing matched" in the sweep notes.
 * (NAHB's national Find-a-Builder sits behind a search form — the state and
 * metro affiliates below are the scrapeable census.)
 */
export const BUILDER_DIRECTORIES: BuilderDirectory[] = [
  { tag: "bild", label: "BILD (GTA)", url: DEFAULT_BILD_URL },
  { tag: "bild_alberta", label: "BILD Alberta", url: "https://bildalberta.ca/membership-directory/" },
  { tag: "bild_calgary", label: "BILD Calgary Region", url: "https://bildcr.com/member-directory/" },
  { tag: "chba_bc", label: "CHBA British Columbia", url: "https://www.chbabc.org/member-directory/" },
  { tag: "fhba", label: "Florida Home Builders Association", url: "https://www.fhba.com/member-directory/" },
  { tag: "basf", label: "Builders Association of South Florida", url: "https://www.basfonline.org/member-directory/" },
  { tag: "tab", label: "Texas Association of Builders", url: "https://www.texasbuilders.org/member-directory/" },
  { tag: "dallas_ba", label: "Dallas Builders Association", url: "https://dallasbuilders.org/member-directory/" },
  { tag: "austin_hba", label: "HBA of Greater Austin", url: "https://www.hbaaustin.com/member-directory/" },
  { tag: "ghba", label: "Greater Houston Builders Association", url: "https://www.ghba.org/member-directory/" },
  { tag: "hba_mt", label: "HBA of Middle Tennessee", url: "https://www.hbamt.org/member-directory/" },
  { tag: "biasc", label: "Building Industry Association of Southern California", url: "https://biasc.org/member-directory/" },
];

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
    .replace(/\s+/g, " ")
    .trim();
}

async function upsertBuilder(
  admin: Admin,
  name: string,
  source: string,
  website: string | null,
): Promise<"added" | "existing" | "skipped"> {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (trimmed.length < 3 || trimmed.length > 120) return "skipped";
  const norm = builderNorm(trimmed);
  if (!norm || norm.length < 3) return "skipped";

  const { data: existing } = await admin
    .from("discovery_builders")
    .select("id, website")
    .eq("name_norm", norm)
    .maybeSingle();
  if (existing) {
    if (website && !existing.website) {
      await admin
        .from("discovery_builders")
        .update({ website })
        .eq("id", existing.id);
    }
    return "existing";
  }
  const { error } = await admin.from("discovery_builders").insert({
    name: trimmed,
    name_norm: norm,
    website,
    source,
  });
  return error ? "skipped" : "added";
}

/** Every builder we already know from the projects table → registry. */
export async function seedBuildersFromProjects(admin: Admin): Promise<SweepSummary> {
  const { data } = await admin
    .from("projects")
    .select("builder_name")
    .not("builder_name", "is", null);
  const names = [
    ...new Set(
      ((data ?? []) as { builder_name: string }[])
        .map((r) => r.builder_name.trim())
        .filter(Boolean),
    ),
  ];
  let added = 0;
  for (const n of names) {
    if ((await upsertBuilder(admin, n, "projects", null)) === "added") added++;
  }
  return {
    source: "seed_builders",
    scanned: names.length,
    added,
    updated: 0,
    notes: [`${names.length} distinct builder names in projects`],
  };
}

export async function probeBild(url?: string): Promise<unknown> {
  const target = url ?? DEFAULT_BILD_URL;
  const html = await fetchText(target);
  // Show enough raw structure to adjust the parser from production output.
  const anchors = [...html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/gi)]
    .map((m) => ({ href: m[1], text: stripTags(m[2]).slice(0, 80) }))
    .filter((a) => a.text.length > 2)
    .slice(0, 40);
  return {
    url: target,
    bytes: html.length,
    anchors,
    text_head: stripTags(html).slice(0, 1500),
  };
}

/**
 * BILD member directory sweep. Heuristic: directory entries render as links
 * or headings whose text is a company name; we keep entries that read like
 * builders/developers and record their website when the link is external.
 */
const BUILDERISH_RE =
  /(home|homes|development|developments|communities|building|builders?|construction|properties|residential|estates|urban|living|group|land|realty devel)/i;
const NOISE_RE =
  /(login|member|directory|contact|about|events|news|sponsor|careers|privacy|terms|search|register|join|renew|facebook|twitter|linkedin|instagram)/i;

export async function sweepBild(
  admin: Admin,
  opts: { url?: string; tag?: string } = {},
): Promise<SweepSummary> {
  const notes: string[] = [];
  const target = opts.url ?? DEFAULT_BILD_URL;
  const tag = opts.tag ?? "bild";
  const homeHost = new URL(target).hostname.replace(/^www\./, "");
  const html = await fetchText(target, 20_000);

  const candidates = new Map<string, string | null>(); // name -> website
  for (const m of html.matchAll(
    /<a[^>]+href="([^"]+)"[^>]*>([\s\S]{0,140}?)<\/a>/gi,
  )) {
    const href = m[1];
    const text = stripTags(m[2]);
    if (!text || text.length < 4 || text.length > 90) continue;
    if (NOISE_RE.test(text) || NOISE_RE.test(href)) continue;
    if (!BUILDERISH_RE.test(text)) continue;
    // A member's website is an external link — the directory's own pages
    // (whatever its host) are never websites.
    const external =
      /^https?:\/\//i.test(href) && !href.includes(homeHost) ? href : null;
    if (!candidates.has(text)) candidates.set(text, external);
  }
  // Headings too (directories often render names as h3/h4 without links).
  for (const m of html.matchAll(/<h[2-5][^>]*>([\s\S]{0,140}?)<\/h[2-5]>/gi)) {
    const text = stripTags(m[1]);
    if (!text || text.length < 4 || text.length > 90) continue;
    if (NOISE_RE.test(text) || !BUILDERISH_RE.test(text)) continue;
    if (!candidates.has(text)) candidates.set(text, null);
  }

  notes.push(`${candidates.size} builder-ish entries on page`);
  if (candidates.size === 0) {
    notes.push("nothing matched — run probe mode and adjust the parser");
  }

  let added = 0;
  for (const [name, website] of candidates) {
    if ((await upsertBuilder(admin, name, tag, website)) === "added") added++;
  }

  return {
    source: tag,
    scanned: candidates.size,
    added,
    updated: 0,
    notes,
  };
}

/** Sweep every association directory (Wednesday cron leg + "builder-dirs"). */
export async function sweepAllDirectories(admin: Admin): Promise<SweepSummary[]> {
  const out: SweepSummary[] = [];
  for (const dir of BUILDER_DIRECTORIES) {
    out.push(
      await sweepBild(admin, { url: dir.url, tag: dir.tag }).catch((e) => ({
        source: dir.tag,
        scanned: 0,
        added: 0,
        updated: 0,
        notes: [`ERROR: ${e instanceof Error ? e.message : String(e)}`],
      })),
    );
  }
  return out;
}
