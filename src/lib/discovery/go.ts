import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { ingestExtractedProject } from "@/lib/email-intake/ingest";
import type { ExtractedProject } from "@/lib/email-intake/extract";
import { matchSignalToWatch, isKnownBuilder, type SignalRow, type WatchRow } from "./match";

type Admin = ReturnType<typeof createAdminClient>;

export interface IgniteOutcome {
  signal_id: string;
  action: string;
  published: boolean;
  project_id: string | null;
  matched_watch: boolean;
  notes: string;
}

/**
 * Go time. A name signal gets cross-referenced against the watchlist and the
 * builder registry, then fed through the SAME pipeline as a forwarded email:
 * dedup against existing projects, web-research when thin, geography-gated
 * auto-publish, SEO + IndexNow. Planning-data matches publish at full
 * confidence — the address was corroborated by the city months ago.
 */
export async function igniteSignal(
  admin: Admin,
  signal: SignalRow,
): Promise<IgniteOutcome> {
  // 1. Cross-reference address ↔ watchlist.
  let watch: WatchRow | null = null;
  if (signal.matched_watch_id) {
    const { data } = await admin
      .from("discovery_watch")
      .select(
        "id, address_full, address_norm, city, description, units, storeys, developer_name, application_type, status",
      )
      .eq("id", signal.matched_watch_id)
      .maybeSingle();
    watch = (data as WatchRow | null) ?? null;
  }
  if (!watch) watch = await matchSignalToWatch(admin, signal);

  const raw = (signal.raw ?? {}) as {
    storeys?: number | null;
    units?: number | null;
    status?: string | null;
  };
  const builder = signal.builder_name ?? watch?.developer_name ?? null;
  const knownBuilder = await isKnownBuilder(admin, builder);

  // 2. Confidence: planning-data address match ≈ verified geography; a known
  //    builder corroborates further. Thin unmatched signals stay below the
  //    publish gate so ingest's web-research pass has to confirm them.
  const address = signal.address_full ?? watch?.address_full ?? null;
  const city = signal.city ?? watch?.city ?? null;
  const confidence = watch
    ? 0.92
    : address && city
      ? knownBuilder
        ? 0.85
        : 0.78
      : 0.5;

  const ex: ExtractedProject = {
    is_actionable: true,
    confidence,
    project_name: signal.project_name,
    builder_name: builder,
    project_type: null,
    city,
    address_full: address,
    price_from: null,
    price_to: null,
    bedrooms_summary: null,
    occupancy_estimate_text: null,
    incentives: null,
    commission_summary: null,
    commission_percent: null,
    broker_portal_url: null,
    broker_portal_name: null,
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    brokerage_name: null,
    notes: [
      watch
        ? `Matched planning application ${watch.application_type ?? ""} at ${watch.address_full} (${watch.units ?? "?"} units, ${watch.storeys ?? "?"} storeys).`
        : null,
      raw.status ? `Source status: ${raw.status}.` : null,
      knownBuilder ? "Builder found in registry." : null,
    ]
      .filter(Boolean)
      .join(" "),
  };

  const result = await ingestExtractedProject(ex, {
    from: `discovery:${signal.source}`,
    subject: signal.source_url ?? signal.project_name,
    images: [],
  });

  // 3. Write outcomes back so the Discovery tab shows the full story.
  await admin
    .from("discovery_signals")
    .update({
      status: result.action === "error" ? "error" : "ingested",
      matched_watch_id: watch?.id ?? null,
      project_id: result.project_id,
      notes: result.notes,
    })
    .eq("id", signal.id);

  if (watch) {
    await admin
      .from("discovery_watch")
      .update({
        status: result.published ? "published" : "matched",
        project_name: signal.project_name,
        matched_project_id: result.project_id,
      })
      .eq("id", watch.id);
  }

  // 4. Enrich the project with planning specifics the marketing may not carry
  //    — and flag purpose-built rentals so they land in the rentals lane.
  const PBR_RE = /purpose[\s-]?built rental|rental (apartment|building|tower|units)|\bPBR\b/i;
  const isRental =
    PBR_RE.test(watch?.description ?? "") || PBR_RE.test(String(raw.status ?? ""));
  if (result.project_id && (watch?.units || watch?.storeys || isRental)) {
    const { data: cur } = await admin
      .from("projects")
      .select("total_units, storeys, listing_type")
      .eq("id", result.project_id)
      .maybeSingle();
    if (cur) {
      const patch: Record<string, unknown> = {};
      if (cur.total_units == null && watch?.units) patch.total_units = watch.units;
      if (cur.storeys == null && watch?.storeys) patch.storeys = watch.storeys;
      if (isRental && cur.listing_type !== "for_rent") {
        patch.listing_type = "for_rent";
        patch.price_period = "monthly";
      }
      if (Object.keys(patch).length) {
        await admin.from("projects").update(patch).eq("id", result.project_id);
      }
    }
  }

  return {
    signal_id: signal.id,
    action: result.action,
    published: result.published,
    project_id: result.project_id,
    matched_watch: Boolean(watch),
    notes: result.notes,
  };
}
