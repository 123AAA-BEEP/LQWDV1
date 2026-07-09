import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { researchProject } from "@/lib/email-intake/research";
import type { ExtractedProject } from "@/lib/email-intake/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Draft corroboration runner — the missing bridge for name-only drafts.
 *
 * Discovery signals get researched BEFORE a row exists, but drafts created in
 * the pre-skip era (or from thin email drops) sit with just a name and city.
 * Re-injecting them as signals doesn't work: the ingest's pre-research fuzzy
 * match finds the draft itself and short-circuits. This runner researches the
 * DRAFT directly: web-corroborate, fill empty fields non-destructively, and
 * stamp the outcome in import_notes. It never publishes — publishing stays a
 * deliberate step once a draft clears the credibility bar (builder + address).
 *
 *   ?limit=2   drafts per run (max 4 — each research pass is ~30s)
 *   ?city=a,b  optional comma-separated city filters (ilike fragments)
 * Auth: ?key=INBOUND_EMAIL_SECRET or Bearer CRON_SECRET.
 *
 * Every attempt is marked "[draft-research ...]" in import_notes and never
 * retried — uncorroborated drafts stay drafts without burning credits twice.
 */

const ATTEMPT_MARKER = "[draft-research";

function authorized(req: Request, url: URL): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (secret && url.searchParams.get("key") === secret) return true;
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  return false;
}

interface DraftRow {
  id: string;
  project_name: string;
  builder_name: string | null;
  address_full: string | null;
  city: string | null;
  province: string | null;
  project_type: string | null;
  import_notes: string | null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!authorized(req, url)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 2, 1), 4);
  const cityParam = (url.searchParams.get("city") ?? "").trim();

  const admin = createAdminClient();

  let query = admin
    .from("projects")
    .select(
      "id, project_name, builder_name, address_full, city, province, project_type, import_notes",
    )
    .eq("record_status", "draft")
    .or("builder_name.is.null,address_full.is.null")
    .or(`import_notes.is.null,import_notes.not.ilike.*${ATTEMPT_MARKER}*`);
  if (cityParam) {
    query = query.or(
      cityParam
        .split(",")
        .map((c) => `city.ilike.*${c.trim()}*`)
        .join(","),
    );
  }
  const { data } = await query.order("created_at", { ascending: true }).limit(limit);
  const drafts = (data ?? []) as DraftRow[];

  const results: {
    id: string;
    name: string;
    city: string | null;
    outcome: string;
    filled?: string[];
  }[] = [];

  for (const d of drafts) {
    const ex: ExtractedProject = {
      is_actionable: true,
      confidence: 0.3, // below the publish gate — forces a real research pass
      project_name: d.project_name,
      builder_name: d.builder_name,
      project_type: d.project_type,
      city: d.city,
      address_full: d.address_full,
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
      notes: null,
    };

    const research = await researchProject(ex).catch(() => null);
    const stamp = new Date().toISOString().slice(0, 10);

    if (!research) {
      // API unavailable/unconfigured — leave the draft UNMARKED so a later
      // run retries it instead of burning the one attempt on an outage.
      results.push({ id: d.id, name: d.project_name, city: d.city, outcome: "research unavailable — will retry" });
      continue;
    }

    const patch: Record<string, unknown> = {};
    const filled: string[] = [];
    const fill = (k: keyof DraftRow | "price_from_public" | "bedrooms_summary" | "occupancy_estimate_text", v: string | number | null) => {
      if (v != null && v !== "" && !(d as unknown as Record<string, unknown>)[k]) {
        patch[k] = v;
        filled.push(String(k));
      }
    };

    if (research.found) {
      fill("builder_name", research.builder_name);
      fill("address_full", research.address_full);
      fill("city", research.city);
      fill("province", research.province_or_state);
      fill("project_type", research.project_type);
      if (research.price_from != null) {
        patch.price_from_public = research.price_from;
        filled.push("price_from_public");
      }
      fill("bedrooms_summary", research.bedrooms_summary);
      fill("occupancy_estimate_text", research.occupancy_estimate_text);
    }

    patch.import_notes =
      `${d.import_notes ? d.import_notes + "\n" : ""}${ATTEMPT_MARKER} ${stamp}: ` +
      (research.found
        ? `corroborated (${research.confidence.toFixed(2)}) via ${research.sources.slice(0, 3).join(", ") || "web"}; filled ${filled.length} field(s).]`
        : `could not corroborate — stays draft.]`);

    await admin.from("projects").update(patch).eq("id", d.id);

    results.push({
      id: d.id,
      name: d.project_name,
      city: d.city,
      outcome: research.found
        ? `corroborated (${research.confidence.toFixed(2)})`
        : "not corroborated",
      filled,
    });
  }

  // Remaining queue size for the caller/cron dashboard.
  let remainQuery = admin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("record_status", "draft")
    .or("builder_name.is.null,address_full.is.null")
    .or(`import_notes.is.null,import_notes.not.ilike.*${ATTEMPT_MARKER}*`);
  if (cityParam) {
    remainQuery = remainQuery.or(
      cityParam
        .split(",")
        .map((c) => `city.ilike.*${c.trim()}*`)
        .join(","),
    );
  }
  const { count: remaining } = await remainQuery;

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    processed: results.length,
    remaining: remaining ?? 0,
    results,
  });
}
