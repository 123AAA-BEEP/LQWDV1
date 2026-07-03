import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { addressesMatch, builderNorm, cityNorm } from "./normalize";

type Admin = ReturnType<typeof createAdminClient>;

export interface WatchRow {
  id: string;
  address_full: string | null;
  address_norm: string | null;
  city: string | null;
  description: string | null;
  units: number | null;
  storeys: number | null;
  developer_name: string | null;
  application_type: string | null;
  status: string;
}

export interface SignalRow {
  id: string;
  source: string;
  source_url: string | null;
  project_name: string;
  builder_name: string | null;
  address_full: string | null;
  city: string | null;
  raw: Record<string, unknown> | null;
  status: string;
  matched_watch_id: string | null;
  project_id: string | null;
}

/**
 * Cross-reference a name-bearing signal against the address watchlist.
 * A hit means the marketing name just landed on a site we've been watching
 * since its planning application — the highest-confidence discovery there is.
 */
export async function matchSignalToWatch(
  admin: Admin,
  signal: SignalRow,
): Promise<WatchRow | null> {
  if (!signal.address_full) return null;
  const city = cityNorm(signal.city);

  let q = admin
    .from("discovery_watch")
    .select(
      "id, address_full, address_norm, city, description, units, storeys, developer_name, application_type, status",
    )
    .in("status", ["watching", "matched"])
    .limit(400);
  // City narrows the candidate set; planning rows are all city-stamped.
  if (city) q = q.ilike("city", city === "toronto" ? "%toronto%" : `%${city}%`);
  const { data } = await q;

  for (const w of (data ?? []) as WatchRow[]) {
    if (addressesMatch(signal.address_full, w.address_full)) return w;
  }
  return null;
}

/** Is this builder in the known-universe registry? (Confidence booster.) */
export async function isKnownBuilder(
  admin: Admin,
  name: string | null,
): Promise<boolean> {
  if (!name) return false;
  const norm = builderNorm(name);
  if (norm.length < 3) return false;
  const { data } = await admin
    .from("discovery_builders")
    .select("id, name_norm")
    .ilike("name_norm", `%${norm.split(" ")[0]}%`)
    .limit(25);
  return ((data ?? []) as { name_norm: string }[]).some(
    (b) =>
      b.name_norm === norm ||
      b.name_norm.includes(norm) ||
      norm.includes(b.name_norm),
  );
}
