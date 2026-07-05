import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { findExistingProjectFuzzy } from "@/lib/projects-dedup";
import { maybeGenerateSeoOnPublish } from "@/lib/seo";
import { pingIndexNow } from "@/lib/indexnow";
import { regionForProvince } from "@/lib/regions";
import { researchProject, type ResearchResult } from "./research";
import { attachGalleryAndHero } from "./media";
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
    await admin.from("public_project_pages").insert({
      project_id: projectId,
      slug,
      is_active: true,
      indexable: true,
      published_at: now,
    });
  }
  await admin
    .from("projects")
    .update({
      public_page_enabled: true,
      record_status: "published",
      published_at: now,
    })
    .eq("id", projectId);

  // SEO generation is a 30-60s LLM call and the intake webhook lives inside a
  // hard 60s budget (now shared with the web-research pass). Hand it to the
  // backfill endpoint, which runs as its own function with its own budget —
  // the 1.5s race just gives the request time to leave the socket.
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liqwd.ca").replace(/\/+$/, "");
  const key = process.env.INBOUND_EMAIL_SECRET;
  if (key) {
    await Promise.race([
      fetch(
        `${base}/api/seo-backfill?key=${encodeURIComponent(key)}&limit=1&project=${encodeURIComponent(projectId)}`,
      ).catch(() => null),
      new Promise((r) => setTimeout(r, 1_500)),
    ]);
    // No hero (intake had no usable imagery)? Hand hero-sourcing the page the
    // same way — its own function, its own budget, publish already done.
    const { data: h } = await admin
      .from("projects")
      .select("hero_image_url")
      .eq("id", projectId)
      .maybeSingle();
    if (!h?.hero_image_url) {
      await Promise.race([
        fetch(
          `${base}/api/hero-backfill?key=${encodeURIComponent(key)}&project=${encodeURIComponent(projectId)}`,
        ).catch(() => null),
        new Promise((r) => setTimeout(r, 1_500)),
      ]);
    }
  } else {
    await maybeGenerateSeoOnPublish(projectId, admin);
  }

  // First-to-market: tell search engines the moment the page exists.
  await pingIndexNow([`/projects/${slug}`, "/", "/sitemap.xml"]);
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
  opts: {
    /** What to do with a new project research can't corroborate. Email drops
     *  default to "draft" (a human sent it — worth admin review); scraped
     *  name-only discovery signals pass "skip" so an unverifiable nav label
     *  or slogan never becomes a project row at all. */
    onUnverified?: "draft" | "skip";
  } = {},
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
    // ---- UPDATE an existing project (non-destructive) ----------------------
    // Used for both the pre-research match (email drops carry a city) and the
    // post-research re-match (scraped name-only signals get their city from
    // the web — without the second look, "Riverbank Place" from an aggregator
    // re-creates the Riverbank Place we already feature).
    const updateExisting = async (
      match: NonNullable<
        Awaited<ReturnType<typeof findExistingProjectFuzzy>>
      >,
      fills: {
        builder_name: string | null;
        address_full: string | null;
        project_type: string | null;
        price_from: number | null;
        bedrooms_summary: string | null;
        occupancy_estimate_text: string | null;
      },
    ): Promise<IngestResult> => {
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
      fillStr("builder_name", fills.builder_name);
      fillStr("address_full", fills.address_full);
      fillStr("project_type", normType(fills.project_type));
      fillNum("price_from_public", fills.price_from);
      fillNum("price_to_public", ex.price_to);
      fillStr("bedrooms_summary", fills.bedrooms_summary);
      fillStr("occupancy_estimate_text", fills.occupancy_estimate_text);
      if (!cur.external_source) patch.external_source = "email_intake";
      patch.import_notes = `${cur.import_notes ? cur.import_notes + "\n" : ""}${provenance}`;

      if (Object.keys(patch).length) {
        await admin.from("projects").update(patch).eq("id", match.id);
      }
      // Add gallery imagery (and a smart hero if missing) when the project has
      // no media yet — matched updates enrich, never duplicate.
      if (ctx.images.length > 0) {
        const { count: mediaCount } = await admin
          .from("project_media")
          .select("id", { count: "exact", head: true })
          .eq("project_id", match.id);
        if ((mediaCount ?? 0) === 0) {
          await attachGalleryAndHero(admin, match.id, ctx.images, {
            setHero: !cur.hero_image_url,
            projectName: match.project_name,
          });
        }
      }
      if (ex.broker_portal_url)
        await attachPortal(admin, match.id, ex.broker_portal_url, ex.broker_portal_name);
      await attachCommission(admin, match.id, ex.commission_summary, ex.commission_percent);

      return {
        action: "updated",
        project_id: match.id,
        published: cur.record_status === "published",
        notes: `Matched “${match.project_name}” (${match.record_status}, ${match.matched_by}); filled ${Object.keys(patch).length} field(s).`,
      };
    };

    const match = await findExistingProjectFuzzy(admin, ex.project_name, ex.city);
    if (match) {
      return await updateExisting(match, {
        builder_name: ex.builder_name,
        address_full: ex.address_full,
        project_type: ex.project_type,
        price_from: ex.price_from,
        bedrooms_summary: ex.bedrooms_summary,
        occupancy_estimate_text: ex.occupancy_estimate_text,
      });
    }

    // ---- CREATE: research thin drops, then auto-publish when geography holds
    // Hot-drop rule: geography is the publish gate, not raw email confidence.
    // When the email is thin (no city/address or low confidence), cross-
    // reference the open web (builder site, UrbanToronto, Urbanation, BBH…)
    // to pin the address and corroborate the project.
    let research: ResearchResult | null = null;
    const thin =
      !ex.city || !ex.address_full || ex.confidence < PUBLISH_CONFIDENCE;
    if (thin) {
      research = await researchProject(ex);
    }
    const merged = {
      city: ex.city ?? research?.city ?? null,
      province: research?.province_or_state ?? null,
      address_full: ex.address_full ?? research?.address_full ?? null,
      builder_name: ex.builder_name ?? research?.builder_name ?? null,
      project_type: ex.project_type ?? research?.project_type ?? null,
      price_from: ex.price_from ?? research?.price_from ?? null,
      bedrooms_summary: ex.bedrooms_summary ?? research?.bedrooms_summary ?? null,
      occupancy_estimate_text:
        ex.occupancy_estimate_text ?? research?.occupancy_estimate_text ?? null,
    };
    const researchNote = research
      ? research.found
        ? ` | web-research: corroborated (${research.confidence.toFixed(2)}) via ${research.sources.slice(0, 3).join(", ") || "sources"}`
        : " | web-research: could not corroborate"
      : "";

    // Research just pinned a city the extraction lacked — check for an
    // existing project again BEFORE creating anything. This is the duplicate
    // gate for scraped name-only signals.
    if (
      merged.city &&
      (!ex.city || merged.city.toLowerCase() !== ex.city.toLowerCase())
    ) {
      const lateMatch = await findExistingProjectFuzzy(
        admin,
        ex.project_name,
        merged.city,
      );
      if (lateMatch) {
        return await updateExisting(lateMatch, {
          builder_name: merged.builder_name,
          address_full: merged.address_full,
          project_type: merged.project_type,
          price_from: merged.price_from,
          bedrooms_summary: merged.bedrooms_summary,
          occupancy_estimate_text: merged.occupancy_estimate_text,
        });
      }
    }

    // Scraped signals live or die on corroboration: if the web can't confirm
    // a residential development by this name, don't create anything — the
    // signal keeps the name for audit, and a real project will resurface
    // through another source.
    const corroborated =
      ex.confidence >= PUBLISH_CONFIDENCE || research?.found === true;
    if (opts.onUnverified === "skip" && !corroborated) {
      return {
        action: "skipped",
        project_id: null,
        published: false,
        notes: `“${ex.project_name}” — web research couldn't corroborate a residential development by this name; skipped (no draft created).`,
      };
    }

    const slug = slugify(ex.project_name);
    const { data: created, error: insErr } = await admin
      .from("projects")
      .insert({
        slug,
        project_name: ex.project_name,
        builder_name: merged.builder_name,
        builder_names_raw: merged.builder_name,
        city: merged.city ?? "Unknown",
        ...(merged.province ? { province: merged.province } : {}),
        address_full: merged.address_full,
        project_type: normType(merged.project_type),
        price_from_public: merged.price_from,
        price_to_public: ex.price_to,
        bedrooms_summary: merged.bedrooms_summary,
        occupancy_estimate_text: merged.occupancy_estimate_text,
        record_status: "draft",
        external_source: "email_intake",
        external_source_url: ex.contact_email ? `mailto:${ex.contact_email}` : null,
        import_notes: provenance + researchNote,
        description_ai_draft: [ex.incentives, research?.facts_summary]
          .filter(Boolean)
          .join("\n\n") || null,
      })
      .select("id")
      .single();
    if (insErr || !created) throw new Error(insErr?.message ?? "insert failed");
    const projectId = created.id as string;

    // Gallery + vision-picked hero (a rendering beats the wordmark og:image).
    if (ctx.images.length > 0) {
      await attachGalleryAndHero(admin, projectId, ctx.images, {
        setHero: true,
        projectName: ex.project_name,
      });
    }
    if (ex.broker_portal_url)
      await attachPortal(admin, projectId, ex.broker_portal_url, ex.broker_portal_name);
    await attachCommission(admin, projectId, ex.commission_summary, ex.commission_percent);

    // Publish when we have geography AND either a confident extraction or an
    // independent web corroboration — AND the geography is a market we
    // operate in. A verified Atlanta or NYC project is real, but with no
    // agents, no region LP, and no compliance voice there, it holds as a
    // draft until we open that market. Unknown province keeps legacy
    // city-only gating (Ontario email drops often skip research).
    const inMarket =
      !merged.province || regionForProvince(merged.province) != null;
    const canPublish =
      Boolean(merged.city) &&
      inMarket &&
      (ex.confidence >= PUBLISH_CONFIDENCE || research?.found === true);
    if (canPublish) {
      await publishAdmin(admin, projectId, slug);
      return {
        action: "created",
        project_id: projectId,
        published: true,
        notes: `Created + published “${ex.project_name}” (confidence ${ex.confidence.toFixed(2)}${
          research?.found
            ? `; corroborated by web research: ${research.sources.slice(0, 2).join(", ") || "sources"}`
            : ""
        }).`,
      };
    }
    const draftReason = !merged.city
      ? "no geographical location — email and web research both came up empty"
      : !inMarket
        ? `verified but out of market (${merged.province}) — held until we operate there`
        : `confidence ${ex.confidence.toFixed(2)} below ${PUBLISH_CONFIDENCE} and web research couldn't corroborate the project`;
    return {
      action: "draft",
      project_id: projectId,
      published: false,
      notes: `Created as draft “${ex.project_name}” — ${draftReason}; needs your review.`,
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
