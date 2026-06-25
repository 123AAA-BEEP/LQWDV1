import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUpdateField, type ProposedChange } from "@/lib/update-fields";

/** Convert a raw form string into the value the target column expects. */
function coerce(type: string, raw: string): unknown {
  const v = (raw ?? "").trim();
  if (v === "") return null;
  if (type === "currency" || type === "number") {
    const n = Number(v.replace(/[$,\s]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (type === "boolean") return v === "true" || v.toLowerCase() === "yes";
  return v; // text, enum, url
}

export interface ApplyResult {
  applied: string[];
  skipped: { label: string; reason: string }[];
}

/**
 * Applies an approved update request's structured changes to the canonical
 * tables. Admin-gated by the caller (assertAdmin); uses the service-role client
 * so writes to admin-only base tables (projects, commercials) succeed.
 */
export async function applyUpdateChanges(
  projectId: string,
  changes: ProposedChange[],
): Promise<ApplyResult> {
  const db = createAdminClient();
  const applied: string[] = [];
  const skipped: { label: string; reason: string }[] = [];

  const projectCols: Record<string, unknown> = {};
  const commercialCols: Record<string, unknown> = {};
  let portalUrl: string | null | undefined;

  for (const c of changes) {
    const field = getUpdateField(c.key);
    if (!field) {
      skipped.push({ label: c.label || c.key, reason: "unknown field" });
      continue;
    }
    const value = coerce(field.type, c.to);
    if (field.source === "project" && field.column) {
      projectCols[field.column] = value;
    } else if (field.source === "commercials" && field.column) {
      commercialCols[field.column] = value;
    } else if (field.source === "portal") {
      portalUrl = value as string | null;
    } else {
      skipped.push({ label: field.label, reason: "no write target" });
      continue;
    }
    applied.push(field.label);
  }

  const now = new Date().toISOString();

  if (Object.keys(projectCols).length > 0) {
    const { error } = await db
      .from("projects")
      .update({ ...projectCols, updated_at: now })
      .eq("id", projectId);
    if (error) {
      return {
        applied: [],
        skipped: [{ label: "Project fields", reason: error.message }],
      };
    }
  }

  if (Object.keys(commercialCols).length > 0) {
    const { data: existing } = await db
      .from("project_private_commercials")
      .select("id")
      .eq("project_id", projectId)
      .maybeSingle();
    if (existing) {
      await db
        .from("project_private_commercials")
        .update({ ...commercialCols, updated_at: now })
        .eq("project_id", projectId);
    } else {
      await db
        .from("project_private_commercials")
        .insert({ project_id: projectId, ...commercialCols });
    }
  }

  if (portalUrl !== undefined && portalUrl) {
    const { data: primary } = await db
      .from("project_broker_portals")
      .select("id")
      .eq("project_id", projectId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (primary) {
      await db
        .from("project_broker_portals")
        .update({ url: portalUrl, updated_at: now })
        .eq("id", primary.id);
    } else {
      await db.from("project_broker_portals").insert({
        project_id: projectId,
        portal_name: "Broker portal",
        portal_type: "external_url",
        url: portalUrl,
        status: "approved",
        is_active: true,
        is_primary: true,
      });
    }
  }

  return { applied, skipped };
}
