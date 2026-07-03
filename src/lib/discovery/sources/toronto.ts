import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addressNorm } from "../normalize";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Toronto Open Data — Development Applications (CKAN datastore).
 * This is the address-first feed: OPA / rezoning / site-plan applications land
 * here months-to-years before any marketing exists. Rows become
 * discovery_watch entries; nothing publishes from here alone (no name yet).
 *
 * The dataset's exact column names can drift, so the adapter discovers fields
 * dynamically and `probe` mode returns the raw shape for verification.
 */
const CKAN = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";
const DATASET = "development-applications";

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

interface CkanResource {
  id: string;
  name?: string;
  datastore_active?: boolean;
}

async function activeResourceId(): Promise<string> {
  const pkg = await json<{
    result?: { resources?: CkanResource[] };
  }>(`${CKAN}/package_show?id=${DATASET}`);
  const res = (pkg.result?.resources ?? []).find((r) => r.datastore_active);
  if (!res) throw new Error("no datastore-active resource on dataset");
  return res.id;
}

/** Case-insensitive "first present key" lookup on a record. */
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
  /(residential|apartment|condo|dwelling|mixed[\s-]?use|storey|townhouse|stacked town|purpose[\s-]?built rental)/i;

export interface SweepSummary {
  source: string;
  scanned: number;
  added: number;
  updated: number;
  notes: string[];
}

export async function probeToronto(): Promise<unknown> {
  const rid = await activeResourceId();
  const sample = await json<{ result?: { records?: Record<string, unknown>[] } }>(
    `${CKAN}/datastore_search?resource_id=${rid}&limit=2`,
  );
  const rec = sample.result?.records?.[0] ?? {};
  return { resource_id: rid, field_names: Object.keys(rec), sample: sample.result?.records };
}

export async function sweepToronto(
  admin: Admin,
  limit = 400,
): Promise<SweepSummary> {
  const notes: string[] = [];
  const rid = await activeResourceId();

  // Find a date-ish field to sort by (newest first); fall back to _id desc.
  const first = await json<{ result?: { records?: Record<string, unknown>[] } }>(
    `${CKAN}/datastore_search?resource_id=${rid}&limit=1`,
  );
  const fields = Object.keys(first.result?.records?.[0] ?? {});
  const dateField = fields.find((f) => /date/i.test(f) && /submit|receiv|creat/i.test(f))
    ?? fields.find((f) => /date/i.test(f));
  const sort = dateField ? `${encodeURIComponent(`"${dateField}" desc`)}` : "_id%20desc";
  notes.push(`sort field: ${dateField ?? "_id"}`);

  const data = await json<{ result?: { records?: Record<string, unknown>[] } }>(
    `${CKAN}/datastore_search?resource_id=${rid}&limit=${limit}&sort=${sort}`,
    30_000,
  );
  const records = data.result?.records ?? [];

  let added = 0;
  let updated = 0;
  const rows: {
    source_ref: string;
    address_full: string;
    description: string | null;
    application_type: string | null;
    application_status: string | null;
    units: number | null;
    storeys: number | null;
  }[] = [];

  for (const rec of records) {
    const ref = pick(rec, [
      "APPLICATION_NUMBER", "APPLICATION#", "APPLICATION_NUM", "REFERENCE_FILE#",
      "REFERENCE_FILE_NUMBER", "FILE_NUMBER", "_id",
    ]);
    const address = pick(rec, [
      "ADDRESS", "SITE_ADDRESS", "PROPERTY_ADDRESS", "LOCATION", "STREET_ADDRESS",
    ]);
    const description = pick(rec, ["DESCRIPTION", "PROPOSAL", "APPLICATION_DESCRIPTION"]);
    const type = pick(rec, ["APPLICATION_TYPE", "TYPE"]);
    const status = pick(rec, ["STATUS", "APPLICATION_STATUS", "CURRENT_STATUS"]);
    if (!ref || !address) continue;

    // Only residential-ish proposals are lead-worthy.
    const hay = `${description ?? ""} ${type ?? ""}`;
    if (!RESIDENTIAL_RE.test(hay)) continue;

    const units = description?.match(/(\d{1,4})\s*(?:residential\s+|dwelling\s+)?units/i);
    const storeys = description?.match(/(\d{1,3})[\s-]*storey/i);

    rows.push({
      source_ref: ref,
      address_full: address,
      description: description?.slice(0, 1500) ?? null,
      application_type: type,
      application_status: status,
      units: units ? Number(units[1]) : null,
      storeys: storeys ? Number(storeys[1]) : null,
    });
  }

  // Manual upsert (the unique index is partial, so PostgREST onConflict can't
  // infer it): fetch existing refs for this batch, insert new, touch existing.
  const refs = rows.map((r) => r.source_ref);
  const { data: existing } = refs.length
    ? await admin
        .from("discovery_watch")
        .select("id, source_ref")
        .eq("source", "toronto_opendata")
        .in("source_ref", refs)
    : { data: [] as { id: string; source_ref: string }[] };
  const existingSet = new Map(
    ((existing ?? []) as { id: string; source_ref: string }[]).map((e) => [
      e.source_ref,
      e.id,
    ]),
  );

  for (const r of rows) {
    const hit = existingSet.get(r.source_ref);
    if (hit) {
      await admin
        .from("discovery_watch")
        .update({
          last_seen_at: new Date().toISOString(),
          application_status: r.application_status,
        })
        .eq("id", hit);
      updated++;
    } else {
      const { error } = await admin.from("discovery_watch").insert({
        source: "toronto_opendata",
        source_ref: r.source_ref,
        address_full: r.address_full,
        address_norm: addressNorm(r.address_full),
        city: "Toronto",
        description: r.description,
        application_type: r.application_type,
        application_status: r.application_status,
        units: r.units,
        storeys: r.storeys,
      });
      if (!error) added++;
    }
  }

  return {
    source: "toronto_opendata",
    scanned: records.length,
    added,
    updated,
    notes,
  };
}
