import "server-only";
import type { RegionKey } from "@/lib/regions";

/**
 * Automated licence-register checks against the regulators' PUBLIC lookups:
 *   - Florida DBPR (myfloridalicense.com) — server-rendered ASP search
 *   - BCFSA Find a Professional — register search
 *
 * Both are parsed defensively with probe modes (the sandbox can't reach them;
 * production can — same pattern as the discovery sweeps). A check returns a
 * conservative verdict: `active_match` only when the licence number is found,
 * the register says active/current, AND the agent's name appears — anything
 * less falls back to manual review. Ontario keeps its existing instant path
 * (RECO certificate vision check).
 */

export interface RegisterCheck {
  region: RegionKey;
  license: string;
  found: boolean;
  /** True only for found + active/current + name matched. */
  active_match: boolean;
  status_text: string | null;
  matched_name: string | null;
  detail: string;
}

const UA = {
  "user-agent":
    "Mozilla/5.0 (compatible; LIQWD-verify/1.0; +https://liqwd.ca)",
  accept: "text/html,application/xhtml+xml,application/json",
};

async function fetchText(url: string, timeoutMs = 12_000): Promise<string> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${url.slice(0, 100)}`);
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

/** Loose person-name match: every token of the shorter name in the longer. */
function nameMatches(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((t) => t.length > 1);
  const ta = norm(a);
  const tb = norm(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return short.every((t) => long.includes(t));
}

const ACTIVE_RE = /\b(current,?\s*active|active|licensed|in good standing)\b/i;

/** Florida DBPR: query the public search by licence number. */
async function checkFlorida(
  license: string,
  agentName: string | null,
): Promise<Omit<RegisterCheck, "region" | "license">> {
  const num = license.trim().toUpperCase();
  // The DBPR search accepts the number with or without the SL/BK/BL prefix.
  const url =
    "https://www.myfloridalicense.com/wl11.asp?mode=2&search=LicNbr&SID=&brd=&typ=" +
    `&LicNbr=${encodeURIComponent(num)}`;
  const html = await fetchText(url);
  const text = stripTags(html);

  const found =
    new RegExp(num.replace(/^(SL|BK|BL)/i, ""), "i").test(text) &&
    !/no records? (were )?found/i.test(text);
  if (!found) {
    return {
      found: false,
      active_match: false,
      status_text: null,
      matched_name: null,
      detail: "Licence number not found on the DBPR register.",
    };
  }
  const status = text.match(ACTIVE_RE)?.[0] ?? null;
  const named = nameMatches(agentName, text.slice(0, 4000));
  return {
    found: true,
    active_match: Boolean(status) && named,
    status_text: status,
    matched_name: named ? agentName : null,
    detail: `DBPR: found${status ? `, status "${status}"` : ", status unclear"}${
      named ? ", name matches" : ", name NOT confirmed on result"
    }.`,
  };
}

/** BCFSA: query the public Find-a-Professional register. */
async function checkBc(
  license: string,
  agentName: string | null,
): Promise<Omit<RegisterCheck, "region" | "license">> {
  const num = license.trim();
  // The register is a search UI; its results are fetchable server-side. We
  // query by licence number and fall back to scanning the returned document.
  const url =
    "https://www.bcfsa.ca/public-resources/real-estate/find-professional/find-professional-by-licence-number" +
    `?licence=${encodeURIComponent(num)}`;
  const html = await fetchText(url);
  const text = stripTags(html);

  const found = text.includes(num) && !/no results|not found/i.test(text);
  if (!found) {
    return {
      found: false,
      active_match: false,
      status_text: null,
      matched_name: null,
      detail:
        "Licence number not found in the fetched BCFSA page — the register may require its interactive search; review manually.",
    };
  }
  const status = text.match(/\b(licensed|active|current)\b/i)?.[0] ?? null;
  const named = nameMatches(agentName, text.slice(0, 5000));
  return {
    found: true,
    active_match: Boolean(status) && named,
    status_text: status,
    matched_name: named ? agentName : null,
    detail: `BCFSA: found${status ? `, status "${status}"` : ", status unclear"}${
      named ? ", name matches" : ", name NOT confirmed"
    }.`,
  };
}

export async function registerCheck(
  region: RegionKey,
  license: string,
  agentName: string | null,
): Promise<RegisterCheck> {
  try {
    const result =
      region === "florida"
        ? await checkFlorida(license, agentName)
        : region === "british_columbia"
          ? await checkBc(license, agentName)
          : {
              found: false,
              active_match: false,
              status_text: null,
              matched_name: null,
              detail:
                "Ontario uses the RECO certificate instant-verify path, not a register fetch.",
            };
    return { region, license, ...result };
  } catch (e) {
    return {
      region,
      license,
      found: false,
      active_match: false,
      status_text: null,
      matched_name: null,
      detail: `Register fetch failed (${e instanceof Error ? e.message : String(e)}) — review manually.`,
    };
  }
}

/** Probe: fetch the raw register page for parser tuning from production. */
export async function probeRegister(
  region: RegionKey,
  license: string,
): Promise<{ url: string; text_head: string }> {
  const url =
    region === "florida"
      ? `https://www.myfloridalicense.com/wl11.asp?mode=2&search=LicNbr&SID=&brd=&typ=&LicNbr=${encodeURIComponent(license)}`
      : `https://www.bcfsa.ca/public-resources/real-estate/find-professional/find-professional-by-licence-number?licence=${encodeURIComponent(license)}`;
  const html = await fetchText(url, 15_000);
  return { url, text_head: stripTags(html).slice(0, 3000) };
}
