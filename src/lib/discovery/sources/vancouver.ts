import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addressNorm } from "../normalize";
import type { SweepSummary } from "./toronto";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * City of Vancouver Open Data — issued building permits (Opendatasoft API).
 * The BC address-first feed: a "New Building" permit for a multi-unit
 * residential project lands on the watchlist before marketing exists, exactly
 * like Toronto's development applications. Defensive field mapping + probe
 * mode, same as every other adapter.
 */
const ODS =
  "https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/issued-building-permits/records";

const UA = { "user-agent": "LIQWD-discovery/1.0 (+https://liqwd.ca)" };

async function json<T>(url: string, timeoutMs = 20_000): Promise<T> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${url.slice(0, 120)}`);
  return (await res.json()) as T;
}

function pick(rec: Record<string, unknown>, candidates: string[]): string | null {
  const keys = Object.keys(rec);
  for (const c of candidates) {
    const k = keys.find((x) => x.toLowerCase() === c.toLowerCase());
    if (k != null && rec[k] != null && String(rec[k]).trim() !== "") {
      return String(rec[k]).trim();
    }
  }
  return null;
}

const RESIDENTIAL_RE =
  /(multiple dwelling|dwelling|residential|apartment|condominium|mixed[\s-]?use|storey|units)/i;

export async function probeVancouver(): Promise<unknown> {
  const data = await json<{ results?: Record<string, unknown>[] }>(
    `${ODS}?limit=2&order_by=issueddate%20desc`,
  );
  const rec = data.results?.[0] ?? {};
  return { field_names: Object.keys(rec), sample: data.results };
}

export async function sweepVancouver(
  admin: Admin,
  limit = 100,
): Promise<SweepSummary> {
  const notes: string[] = [];
  // New-construction permits, newest first. The `where` filter narrows to new
  // buildings; residential-ness is re-checked per record below.
  const url =
    `${ODS}?limit=${limit}&order_by=issueddate%20desc` +
    `&where=${encodeURIComponent(`typeofwork="New Building"`)}`;
  let records: Record<string, unknown>[] = [];
  try {
    const data = await json<{ results?: Record<string, unknown>[] }>(url, 30_000);
    records = data.results ?? [];
  } catch (e) {
    // Filter syntax drift — fall back to unfiltered newest and screen locally.
    notes.push(`filtered query failed (${e instanceof Error ? e.message : e}); falling back`);
    const data = await json<{ results?: Record<string, unknown>[] }>(
      `${ODS}?limit=${limit}&order_by=issueddate%20desc`,
      30_000,
    );
    records = data.results ?? [];
  }

  let added = 0;
  let updated = 0;
  for (const rec of records) {
    const ref = pick(rec, ["permitnumber", "permit_number", "permitnumbercreateddate"]);
    const address = pick(rec, ["address", "site_address", "civic_address"]);
    const description = pick(rec, ["projectdescription", "project_description", "description"]);
    const use = pick(rec, ["propertyuse", "property_use", "specificusecategory"]);
    const work = pick(rec, ["typeofwork", "type_of_work"]);
    if (!ref || !address) continue;
    if (work && !/new build/i.test(work)) continue;
    if (!RESIDENTIAL_RE.test(`${description ?? ""} ${use ?? ""}`)) continue;

    const units = description?.match(/(\d{1,4})\s*(?:dwelling\s+|residential\s+)?units/i);
    const storeys = description?.match(/(\d{1,3})[\s-]*store?y/i);
    // Small infill (single dwellings, duplexes) isn't lead-worthy — require
    // scale signals: an explicit unit count ≥ 8, or "multiple dwelling" use.
    const unitCount = units ? Number(units[1]) : null;
    const scale = (unitCount ?? 0) >= 8 || /multiple dwelling/i.test(use ?? "");
    if (!scale) continue;

    const { data: existing } = await admin
      .from("discovery_watch")
      .select("id")
      .eq("source", "vancouver_opendata")
      .eq("source_ref", ref)
      .maybeSingle();
    if (existing) {
      await admin
        .from("discovery_watch")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      updated++;
    } else {
      const { error } = await admin.from("discovery_watch").insert({
        source: "vancouver_opendata",
        source_ref: ref,
        address_full: address,
        address_norm: addressNorm(address),
        city: "Vancouver",
        description: description?.slice(0, 1500) ?? null,
        application_type: work ?? "New Building",
        units: unitCount,
        storeys: storeys ? Number(storeys[1]) : null,
      });
      if (!error) added++;
    }
  }

  return {
    source: "vancouver_opendata",
    scanned: records.length,
    added,
    updated,
    notes,
  };
}
