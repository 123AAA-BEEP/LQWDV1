import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addressNorm } from "../normalize";
import type { SweepSummary } from "./toronto";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Building-permit open-data feeds — the address-first watch lane for every
 * market beyond Toronto/Vancouver, in one generic adapter:
 *
 *   Miami-Dade  ArcGIS Hub    (Building Permit layer)
 *   Nashville   Socrata       data.nashville.gov  3h5w-q8b7
 *   Los Angeles Socrata       data.lacity.org     cpkv-aajs (new housing units)
 *   Calgary     Socrata       data.calgary.ca     c2es-76ed
 *   Edmonton    Socrata       data.edmonton.ca    24uj-dj8v
 *
 * Same philosophy as every adapter: fields are discovered dynamically per
 * record (portals rename columns without notice), probe mode returns the raw
 * shape for live tuning, and rows only reach discovery_watch when they look
 * like multi-unit residential new construction. Nothing publishes from here —
 * a watch entry waits for a name signal to cross-reference.
 */

const UA = { "user-agent": "LIQWD-discovery/1.0 (+https://liqwd.ca)" };

async function json<T>(url: string, timeoutMs = 25_000): Promise<T> {
  const res = await fetch(url, {
    headers: UA,
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${res.status} from ${url.slice(0, 140)}`);
  return (await res.json()) as T;
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

export interface PermitSource {
  /** Runner param + watch source tag suffix, e.g. "miamidade". */
  key: string;
  label: string;
  kind: "socrata" | "arcgis";
  /**
   * Socrata: full resource URL. ArcGIS: an item id (service resolved via the
   * sharing API) or a Hub slug like "mississauga::building-permits" (resolved
   * via the Hub datasets API).
   */
  resource: string;
  /** City stamped when no per-row municipality field exists. */
  defaultCity: string | null;
  /**
   * Development-application feeds (OPA/rezoning/site plan) speak in
   * "proposed", not "new construction" — relax the new-build keyword gate and
   * accept storey-scale as a size signal. Permit feeds leave this unset.
   */
  applications?: boolean;
}

export const PERMIT_SOURCES: PermitSource[] = [
  {
    key: "miamidade",
    label: "Miami-Dade permits",
    kind: "arcgis",
    resource: "31cd319f45544648b59f0418aea60091",
    defaultCity: "Miami",
  },
  {
    key: "nashville",
    label: "Nashville permits",
    kind: "socrata",
    resource: "https://data.nashville.gov/resource/3h5w-q8b7.json",
    defaultCity: "Nashville",
  },
  {
    key: "lapermits",
    label: "LA new-housing permits",
    kind: "socrata",
    resource: "https://data.lacity.org/resource/cpkv-aajs.json",
    defaultCity: "Los Angeles",
  },
  {
    key: "calgary",
    label: "Calgary permits",
    kind: "socrata",
    resource: "https://data.calgary.ca/resource/c2es-76ed.json",
    defaultCity: "Calgary",
  },
  {
    key: "edmonton",
    label: "Edmonton permits",
    kind: "socrata",
    resource: "https://data.edmonton.ca/resource/24uj-dj8v.json",
    defaultCity: "Edmonton",
  },
  {
    key: "mississauga",
    label: "Mississauga development applications",
    kind: "arcgis",
    resource: "mississauga::active-development-applications",
    defaultCity: "Mississauga",
    applications: true,
  },
  {
    key: "hamilton",
    label: "Hamilton development applications",
    kind: "arcgis",
    resource: "hamilton::development-applications-1",
    defaultCity: "Hamilton",
    applications: true,
  },
  {
    key: "austin",
    label: "Austin permits",
    kind: "socrata",
    resource: "https://data.austintexas.gov/resource/3syk-w9eu.json",
    defaultCity: "Austin",
  },
  {
    key: "dallas",
    label: "Dallas permits",
    kind: "socrata",
    resource: "https://www.dallasopendata.com/resource/e7gq-4sah.json",
    defaultCity: "Dallas",
  },
  {
    key: "sanfrancisco",
    label: "San Francisco permits",
    kind: "socrata",
    resource: "https://data.sfgov.org/resource/i98e-djp9.json",
    defaultCity: "San Francisco",
  },
];

export function permitSource(key: string): PermitSource | null {
  return PERMIT_SOURCES.find((s) => s.key === key) ?? null;
}

/* ----------------------------- record fetch ----------------------------- */

async function socrataRecords(
  resource: string,
  limit: number,
  notes: string[],
): Promise<Record<string, unknown>[]> {
  // Discover a date-ish field from one row so we can pull newest-first.
  const first = await json<Record<string, unknown>[]>(`${resource}?$limit=1`);
  const fields = Object.keys(first[0] ?? {});
  const dateField =
    fields.find((f) => /issue/i.test(f) && /date/i.test(f)) ??
    fields.find((f) => /date/i.test(f) && !/update|expir/i.test(f)) ??
    null;
  notes.push(`order field: ${dateField ?? "(none — natural order)"}`);
  const order = dateField
    ? `&$order=${encodeURIComponent(`${dateField} DESC`)}`
    : "";
  return await json<Record<string, unknown>[]>(
    `${resource}?$limit=${limit}${order}`,
    30_000,
  );
}

interface ArcgisLayerMeta {
  fields?: { name: string; type: string }[];
}

async function arcgisLayerUrl(resource: string): Promise<string> {
  // Hub slug ("org::dataset-name") → resolve through the Hub datasets API.
  if (resource.includes("::")) {
    const hub = await json<{
      data?: { attributes?: { url?: string; server?: { url?: string } } }[];
    }>(
      `https://opendata.arcgis.com/api/v3/datasets?filter[slug]=${encodeURIComponent(resource)}&fields[datasets]=url,server`,
    );
    const attrs = hub.data?.[0]?.attributes;
    const url = attrs?.url ?? attrs?.server?.url;
    if (!url) throw new Error(`no service url for Hub slug ${resource}`);
    // attributes.url is usually the layer itself; a bare service gets /0.
    return /\/\d+$/.test(url) ? url : `${url.replace(/\/+$/, "")}/0`;
  }
  // Item id → resolve through the ArcGIS sharing API.
  const meta = await json<{ url?: string }>(
    `https://www.arcgis.com/sharing/rest/content/items/${resource}?f=json`,
  );
  if (!meta.url) throw new Error(`no service url on ArcGIS item ${resource}`);
  return `${meta.url.replace(/\/+$/, "")}/0`;
}

async function arcgisRecords(
  itemId: string,
  limit: number,
  notes: string[],
): Promise<Record<string, unknown>[]> {
  const layer = await arcgisLayerUrl(itemId);
  const layerMeta = await json<ArcgisLayerMeta>(`${layer}?f=json`);
  const dateField = (layerMeta.fields ?? []).find(
    (f) => f.type === "esriFieldTypeDate" && /issue|final|status|appl/i.test(f.name),
  ) ?? (layerMeta.fields ?? []).find((f) => f.type === "esriFieldTypeDate");
  notes.push(`layer: ${layer}`, `order field: ${dateField?.name ?? "(none)"}`);
  const order = dateField
    ? `&orderByFields=${encodeURIComponent(`${dateField.name} DESC`)}`
    : "";
  const data = await json<{
    features?: { attributes?: Record<string, unknown> }[];
    error?: { message?: string };
  }>(
    `${layer}/query?where=1%3D1&outFields=*&returnGeometry=false&f=json&resultRecordCount=${limit}${order}`,
    35_000,
  );
  if (data.error) throw new Error(data.error.message ?? "ArcGIS query error");
  return (data.features ?? [])
    .map((f) => f.attributes ?? {})
    .filter((a) => Object.keys(a).length > 0);
}

/* ------------------------------- filtering ------------------------------ */

const REF_FIELDS = [
  "permitnum", "permit_number", "permit_no", "permitnbr", "permit_", "permit",
  "process_number", "casenumber", "case_number", "pcis_permit_no",
  "applicationnumber", "application_number", "app_number", "file_number",
  "folder_number", "objectid", "id",
];
const ADDRESS_FIELDS = [
  "originaladdress", "original_address", "address", "full_address",
  "site_address", "primary_address", "address_construction", "job_address",
  "location_address", "stname", "location_1_address", "propaddr",
  "civic_address", "location", "address1", "prop_address",
];
const DESC_FIELDS = [
  "description", "job_description", "work_description", "proposeduse",
  "projectname", "project_name", "scopeofwork", "scope_of_work", "purpose",
  "permit_type_description", "use_description", "proposal",
  "application_description", "project_description", "devproposal",
];
const TYPE_FIELDS = [
  "permitclass", "permit_class", "permitclassmapped", "permittype",
  "permit_type", "permit_subtype", "permit_sub_type", "building_type",
  "job_category", "work_type", "worktype", "workclass", "work_class",
  "typeofwork", "occupancy", "use_type", "residential_or_commercial",
  "applicationtype", "application_type", "app_type", "type",
];
const UNITS_FIELDS = [
  "housingunits", "units_added", "units", "numberofunits", "number_of_units",
  "dwelling_units", "residential_units", "proposed_units", "du", "unit_count",
  "units_net_change",
];
const CITY_FIELDS = ["municipality", "city", "jurisdiction", "muni", "city_name"];
const STATUS_FIELDS = [
  "statuscurrent", "status", "current_status", "permit_status", "statusdesc",
];

const RESIDENTIAL_RE =
  /(residential|multi[\s-]?family|multifamily|apartment|condo|dwelling|mixed[\s-]?use|townhouse|town home|rowhouse|purpose[\s-]?built rental|duplex|triplex|storey|story|units)/i;
const NEW_RE = /\bnew\b|new construction|new building|erect/i;
const MULTI_RE =
  /(multi[\s-]?family|multifamily|apartment|condo(?:minium)?|mixed[\s-]?use|purpose[\s-]?built rental|high[\s-]?rise)/i;

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim();
}

export async function probePermits(key: string): Promise<unknown> {
  const src = permitSource(key);
  if (!src) throw new Error(`unknown permit source: ${key}`);
  const notes: string[] = [];
  const records =
    src.kind === "socrata"
      ? await socrataRecords(src.resource, 3, notes)
      : await arcgisRecords(src.resource, 3, notes);
  return {
    source: src.key,
    kind: src.kind,
    notes,
    field_names: Object.keys(records[0] ?? {}),
    sample: records,
  };
}

/** Sweep one permit source into discovery_watch (newest ~250 rows). */
export async function sweepPermits(
  admin: Admin,
  key: string,
  limit = 250,
): Promise<SweepSummary> {
  const src = permitSource(key);
  if (!src) throw new Error(`unknown permit source: ${key}`);
  const sourceTag = `${src.key}_permits`;
  const notes: string[] = [];

  const records =
    src.kind === "socrata"
      ? await socrataRecords(src.resource, limit, notes)
      : await arcgisRecords(src.resource, limit, notes);

  const rows: {
    source_ref: string;
    address_full: string;
    city: string;
    description: string | null;
    application_type: string | null;
    application_status: string | null;
    units: number | null;
    storeys: number | null;
  }[] = [];

  for (const rec of records) {
    const ref = pick(rec, REF_FIELDS);
    const address = pick(rec, ADDRESS_FIELDS);
    if (!ref || !address) continue;

    const description = pick(rec, DESC_FIELDS);
    const type = pick(rec, TYPE_FIELDS);
    const status = pick(rec, STATUS_FIELDS);
    const unitsRaw = pick(rec, UNITS_FIELDS);
    const hay = `${description ?? ""} ${type ?? ""}`;

    // Gate 1: must read as residential; permit feeds additionally require
    // new-construction wording (applications speak in "proposed" instead).
    if (!RESIDENTIAL_RE.test(hay)) continue;
    if (!src.applications && !NEW_RE.test(hay)) continue;

    // Gate 2: scale — single homes and small infill aren't lead-worthy.
    const unitsParsed =
      unitsRaw != null ? parseInt(unitsRaw.replace(/\D+/g, ""), 10) : NaN;
    const descUnits = description?.match(
      /(\d{1,4})\s*(?:dwelling\s+|residential\s+)?units/i,
    );
    const units = Number.isFinite(unitsParsed) && unitsParsed > 0
      ? unitsParsed
      : descUnits
        ? Number(descUnits[1])
        : null;
    const storeys = description?.match(/(\d{1,3})[\s-]*stor(?:y|ey|ies)/i);
    const scaleOk =
      (units ?? 0) >= 8 ||
      MULTI_RE.test(hay) ||
      (src.applications && Number(storeys?.[1] ?? 0) >= 4);
    if (!scaleOk) continue;
    const rowCity = pick(rec, CITY_FIELDS);
    rows.push({
      source_ref: ref,
      address_full: address.slice(0, 200),
      city: rowCity ? titleCase(rowCity) : (src.defaultCity ?? ""),
      description: description?.slice(0, 1500) ?? null,
      application_type: type ?? "Building permit",
      application_status: status,
      units,
      storeys: storeys ? Number(storeys[1]) : null,
    });
  }
  notes.push(`${rows.length} residential multi-unit rows after gates`);

  // Manual upsert (partial unique index — PostgREST onConflict can't infer):
  // fetch existing refs for this batch, insert new, touch existing.
  const refs = rows.map((r) => r.source_ref);
  const { data: existing } = refs.length
    ? await admin
        .from("discovery_watch")
        .select("id, source_ref")
        .eq("source", sourceTag)
        .in("source_ref", refs)
    : { data: [] as { id: string; source_ref: string }[] };
  const existingMap = new Map(
    ((existing ?? []) as { id: string; source_ref: string }[]).map((e) => [
      e.source_ref,
      e.id,
    ]),
  );

  let added = 0;
  let updated = 0;
  for (const r of rows) {
    const hit = existingMap.get(r.source_ref);
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
        source: sourceTag,
        source_ref: r.source_ref,
        address_full: r.address_full,
        address_norm: addressNorm(r.address_full),
        city: r.city || null,
        description: r.description,
        application_type: r.application_type,
        application_status: r.application_status,
        units: r.units,
        storeys: r.storeys,
      });
      if (!error) added++;
      else notes.push(error.message);
    }
  }

  return { source: sourceTag, scanned: records.length, added, updated, notes };
}

/** Sweep every permit source (used by the weekly cron leg + "all-permits"). */
export async function sweepAllPermits(admin: Admin): Promise<SweepSummary[]> {
  const out: SweepSummary[] = [];
  for (const src of PERMIT_SOURCES) {
    out.push(
      await sweepPermits(admin, src.key).catch((e) => ({
        source: `${src.key}_permits`,
        scanned: 0,
        added: 0,
        updated: 0,
        notes: [`ERROR: ${e instanceof Error ? e.message : String(e)}`],
      })),
    );
  }
  return out;
}
