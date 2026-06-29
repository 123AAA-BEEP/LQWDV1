import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { findExistingProject } from "@/lib/projects-dedup";
import { maybeGenerateSeoOnPublish } from "@/lib/seo";
import type { ExtractedProject, InboundImage } from "./extract";

type Admin = ReturnType<typeof createAdminClient>;

/** Auto-publish only when the model is at least this confident in the email. */
const PUBLISH_CONFIDENCE = 0.75;
const PROJECT_TYPES = ["condo", "townhouse", "single_family", "mixed", "other"];

export interface IngestResult {
  action: "created" | "updated" | "draft" | "skipped" | "error";
  project_id: string | null;
  published: boolean;
  notes: string;
}

function normType(v: string | null): string | null {
  if (!v) return null;
  const t = v.toLowerCase().replace(/[\s-]+/g, "_");
  return PROJECT_TYPES.includes(t) ? t : null;
}

/** Uploads one image to project-media and returns its public URL (best-effort). */
async function uploadHero(
  admin: Admin,
  projectId: string,
  img: InboundImage,
): Promise<string | null> {
  try {
    const ext = img.media_type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `email-intake/${projectId}/${Date.now()}.${ext}`;
    const bytes = Buffer.from(img.data, "base64");
    const { error } = await admin.storage
      .from("project-media")
      .upload(path, bytes, { contentType: img.media_type, upsert: true });
    if (error) return null;
    return admin.storage.from("project-media").getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

/** Activates/creates the public page and flips the project to published. */
async function publishAdmin(admin: Admin, projectId: string, slug: string) {
  const now = new Date().toISOString();
  const { data: page } = await admin
    .from("public_project_pages")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();
  if (page) {
    await admin
      .from("public_project_pages")
      .update({ is_active: true, published_at: now })
      .eq("project_id", projectId);
  } else {
    await admin
      .from("public_project_pages")
      .insert({ project_id: projectId, slug, is_active: true, published_at: now });
  }
  await admin
    .from("projects")
    .update({
      public_page_enabled: true,
      record_status: "published",
      published_at: now,
    })
    .eq("id", projectId);
  await maybeGenerateSeoOnPublish(projectId, admin);
}

/** Adds a broker portal if the project doesn't already have one with that URL. */
async function attachPortal(
  admin: Admin,
  projectId: string,
  url: string,
  name: string | null,
) {
  const { data: existing } = await admin
    .from("project_broker_portals")
    .select("id")
    .eq("project_id", projectId)
    .eq("url", url)
    .maybeSingle();
  if (existing) return;
  await admin.from("project_broker_portals").insert({
    project_id: projectId,
    portal_name: name ?? "Broker portal",
    portal_type: "external_url",
    url,
    is_active: true,
    status: "approved",
  });
}

/** Fills empty commission fields (non-destructive — never overwrites curated). */
async function attachCommission(
  admin: Admin,
  projectId: string,
  summary: string | null,
  percent: number | null,
) {
  if (!summary && percent == null) return;
  const { data: existing } = await admin
    .from("project_private_commercials")
    .select("commission_summary, commission_percent")
    .eq("project_id", projectId)
    .maybeSingle();
  if (!existing) {
    await admin.from("project_private_commercials").insert({
      project_id: projectId,
      commission_summary: summary,
      commission_percent: percent,
    });
    return;
  }
  const patch: Record<string, unknown> = {};
  if (!existing.commission_summary && summary) patch.commission_summary = summary;
  if (existing.commission_percent == null && percent != null)
    patch.commission_percent = percent;
  if (Object.keys(patch).length) {
    patch.updated_at = new Date().toISOString();
    await admin
      .from("project_private_commercials")
      .update(patch)
      .eq("project_id", projectId);
  }
}

/**
 * Turns an extracted email into a created or updated project. Guardrails:
 *  - skips non-actionable / nameless emails,
 *  - new projects auto-publish only above PUBLISH_CONFIDENCE (else stay draft),
 *  - existing matches are updated NON-destructively (fill empties, never blank),
 *    and their publish state is left as the admin set it,
 *  - the developer's contact goes to admin-only provenance, never public.
 */
export async function ingestExtractedProject(
  ex: ExtractedProject,
  ctx: { from: string | null; subject: string | null; images: InboundImage[] },
): Promise<IngestResult> {
  if (!ex.is_actionable || !ex.project_name) {
    return {
      action: "skipped",
      project_id: null,
      published: false,
      notes: ex.is_actionable
        ? "No project name extracted."
        : "Not a project marketing email.",
    };
  }

  const admin = createAdminClient();
  const provenance =
    `email-intake | from=${ctx.from ?? "?"} | subject=${ctx.subject ?? "?"} | ` +
    `contact=${[ex.contact_name, ex.contact_phone, ex.contact_email].filter(Boolean).join(" / ") || "?"} | ` +
    `brokerage=${ex.brokerage_name ?? "?"}`;

  try {
    const match = await findExistingProject(admin, ex.project_name, ex.city);

    // ---- UPDATE an existing project (non-destructive) ----------------------
    if (match) {
      const { data: cur } = await admin
        .from("projects")
        .select(
          "id, slug, builder_name, address_full, project_type, price_from_public, price_to_public, bedrooms_summary, occupancy_estimate_text, hero_image_url, external_source, import_notes, record_status",
        )
        .eq("id", match.id)
        .maybeSingle();
      if (!cur) throw new Error("matched project vanished");

      const patch: Record<string, unknown> = {};
      const fillStr = (k: string, v: string | null) => {
        if (v && !cur[k as keyof typeof cur]) patch[k] = v;
      };
      const fillNum = (k: string, v: number | null) => {
        if (v != null && cur[k as keyof typeof cur] == null) patch[k] = v;
      };
      fillStr("builder_name", ex.builder_name);
      fillStr("address_full", ex.address_full);
      fillStr("project_type", normType(ex.project_type));
      fillNum("price_from_public", ex.price_from);
      fillNum("price_to_public", ex.price_to);
      fillStr("bedrooms_summary", ex.bedrooms_summary);
      fillStr("occupancy_estimate_text", ex.occupancy_estimate_text);
      if (!cur.external_source) patch.external_source = "email_intake";
      patch.import_notes = `${cur.import_notes ? cur.import_notes + "\n" : ""}${provenance}`;

      if (Object.keys(patch).length) {
        await admin.from("projects").update(patch).eq("id", match.id);
      }
      if (!cur.hero_image_url && ctx.images[0]) {
        const url = await uploadHero(admin, match.id, ctx.images[0]);
        if (url) await admin.from("projects").update({ hero_image_url: url }).eq("id", match.id);
      }
      if (ex.broker_portal_url)
        await attachPortal(admin, match.id, ex.broker_portal_url, ex.broker_portal_name);
      await attachCommission(admin, match.id, ex.commission_summary, ex.commission_percent);

      return {
        action: "updated",
        project_id: match.id,
        published: cur.record_status === "published",
        notes: `Matched “${match.project_name}” (${match.record_status}); filled ${Object.keys(patch).length} field(s).`,
      };
    }

    // ---- CREATE a new draft, then auto-publish if confident ----------------
    const slug = slugify(ex.project_name);
    const { data: created, error: insErr } = await admin
      .from("projects")
      .insert({
        slug,
        project_name: ex.project_name,
        builder_name: ex.builder_name,
        builder_names_raw: ex.builder_name,
        city: ex.city ?? "Unknown",
        address_full: ex.address_full,
        project_type: normType(ex.project_type),
        price_from_public: ex.price_from,
        price_to_public: ex.price_to,
        bedrooms_summary: ex.bedrooms_summary,
        occupancy_estimate_text: ex.occupancy_estimate_text,
        record_status: "draft",
        external_source: "email_intake",
        external_source_url: ex.contact_email ? `mailto:${ex.contact_email}` : null,
        import_notes: provenance,
        description_ai_draft: ex.incentives,
      })
      .select("id")
      .single();
    if (insErr || !created) throw new Error(insErr?.message ?? "insert failed");
    const projectId = created.id as string;

    if (ctx.images[0]) {
      const url = await uploadHero(admin, projectId, ctx.images[0]);
      if (url) await admin.from("projects").update({ hero_image_url: url }).eq("id", projectId);
    }
    if (ex.broker_portal_url)
      await attachPortal(admin, projectId, ex.broker_portal_url, ex.broker_portal_name);
    await attachCommission(admin, projectId, ex.commission_summary, ex.commission_percent);

    const canPublish = ex.confidence >= PUBLISH_CONFIDENCE && Boolean(ex.city);
    if (canPublish) {
      await publishAdmin(admin, projectId, slug);
      return {
        action: "created",
        project_id: projectId,
        published: true,
        notes: `Created + published “${ex.project_name}” (confidence ${ex.confidence.toFixed(2)}).`,
      };
    }
    return {
      action: "draft",
      project_id: projectId,
      published: false,
      notes: `Created as draft “${ex.project_name}” — ${
        ex.city ? `confidence ${ex.confidence.toFixed(2)} below ${PUBLISH_CONFIDENCE}` : "no city extracted"
      }; review before publishing.`,
    };
  } catch (e) {
    return {
      action: "error",
      project_id: null,
      published: false,
      notes: e instanceof Error ? e.message : String(e),
    };
  }
}
