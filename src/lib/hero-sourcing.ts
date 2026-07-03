import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { maybeGenerateSeoOnPublish } from "@/lib/seo";
import { slugify } from "@/lib/slug";
import { primaryBuilderName } from "@/lib/types";
import { builderNorm } from "@/lib/discovery/normalize";
import { fetchLinkContext } from "@/lib/email-intake/fetch-links";
import { attachGalleryAndHero } from "@/lib/email-intake/media";

/**
 * Hands-off, high-quality hero sourcing.
 *
 * For draft projects that lack a real (verified) hero image, this:
 *   1. builds candidate listing-page URLs from the project name/city/builder,
 *   2. asks the liqwd-source-hero edge function to rehost each page's og:image,
 *   3. runs an AI VISION GATE on the candidate — only real exterior/interior/
 *      aerial renderings or building photos pass; floor plans, site maps, logos,
 *      text/brochure pages and headshots are rejected,
 *   4. on the first pass, sets the hero, publishes, and auto-generates the SEO
 *      sections.
 *
 * Because nothing publishes unless the vision gate confirms a real rendering,
 * imperfect URL discovery is safe — a miss just leaves the project unpublished.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SOURCE_FN = `${SUPABASE_URL}/functions/v1/liqwd-source-hero`;
const VISION_MODEL = "claude-opus-4-8";

const PUBLISHABLE_KINDS = new Set([
  "exterior_rendering",
  "interior_rendering",
  "aerial_rendering",
  "photo_building",
]);

export interface SourcingResult {
  id: string;
  name: string;
  published: boolean;
  kind?: string;
  reason: string;
}

function slug(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Aggregator listing URLs likely to carry a hero rendering as og:image. */
function candidatePageUrls(
  name: string,
  city: string | null,
  builder: string | null,
): string[] {
  const n = slug(name);
  const c = slug(city);
  const b = slug((builder ?? "").split(/[,/]| and /i)[0]); // first builder only
  const dash = name.trim().replace(/\s+/g, "-");
  // Harbour Marketing portal slugs concatenate the name (no separators), e.g.
  // navaoakville, oxfordestates, thegardenseries2, allure.
  const concat = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const urls: string[] = [];
  if (c) {
    urls.push(`https://www.gta-homes.com/${c}-condos/${n}/`);
    urls.push(`https://www.gta-homes.com/${c}-condos/${n}-towns/`);
  }
  urls.push(`https://condonow.com/${dash}`);
  urls.push(`https://condonow.com/${dash}-Towns`);
  if (b && c) {
    urls.push(`https://www.tallproperty.com/property/${n}-by-${b}-in-${c}/`);
  }
  // Harbour Marketing — VIP broker portals, often the only source for a
  // "coming soon" project with minimal details elsewhere.
  if (concat) {
    urls.push(`https://www.harbourmarketing.ca/account/${concat}`);
    urls.push(`https://www.harbourmarketing.ca/${concat}`);
    urls.push(`https://www.harbourmarketing.ca/project-${n}`);
  }
  return urls;
}

/** The AI vision gate. Returns whether the image is a publishable hero. */
async function classifyImage(
  imageUrl: string,
): Promise<{ kind: string; publishable: boolean; reason: string }> {
  let resp: Response;
  try {
    resp = await fetch(imageUrl);
  } catch (e) {
    return { kind: "other", publishable: false, reason: `fetch failed: ${e}` };
  }
  if (!resp.ok) return { kind: "other", publishable: false, reason: `fetch ${resp.status}` };
  const ct = (resp.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
  if (!ct.startsWith("image/")) return { kind: "other", publishable: false, reason: `not image (${ct})` };
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 2048) return { kind: "other", publishable: false, reason: "image too small" };
  const media = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(ct)
    ? ct
    : "image/jpeg";

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: VISION_MODEL,
    max_tokens: 256,
    system:
      "You vet a single image scraped as a candidate hero for a new-home project listing. Decide what it actually depicts and whether it works as a marketplace hero.",
    tools: [
      {
        name: "classify",
        description: "Classify the candidate hero image.",
        input_schema: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: [
                "exterior_rendering",
                "interior_rendering",
                "aerial_rendering",
                "photo_building",
                "floor_plan",
                "site_map",
                "logo_or_text",
                "person_or_lifestyle",
                "other",
              ],
              description: "What the image primarily depicts.",
            },
            publishable: {
              type: "boolean",
              description:
                "true ONLY for a real exterior/interior/aerial rendering or photograph of the building or community, suitable as a marketplace hero. false for floor plans, site/key plans, maps, logos, pure text or brochure pages, headshots/lifestyle stock, collages dominated by text, or anything unclear.",
            },
            reason: { type: "string", description: "Brief reason, max 12 words." },
          },
          required: ["kind", "publishable", "reason"],
          additionalProperties: false,
        },
      },
    ],
    tool_choice: { type: "tool", name: "classify" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: media as "image/jpeg", data: buf.toString("base64") } },
          { type: "text", text: "Classify this candidate hero image." },
        ],
      },
    ],
  });

  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    return { kind: "other", publishable: false, reason: "no classification" };
  }
  const out = block.input as Record<string, unknown>;
  const kind = String(out.kind ?? "other");
  // Trust the model's boolean, but also require a known-good kind as a backstop.
  const publishable = Boolean(out.publishable) && PUBLISHABLE_KINDS.has(kind);
  return { kind, publishable, reason: String(out.reason ?? "") };
}

interface ProjectRow {
  id: string;
  project_name: string;
  city: string | null;
  builder_name: string | null;
}

interface SourceFnResponse {
  ok?: boolean;
  url?: string;
  source_image?: string;
}

/** Tries candidates until one yields a vision-verified rendering. */
async function sourceVerifiedHero(
  project: ProjectRow,
): Promise<{ ok: boolean; heroUrl?: string; kind?: string; reason: string }> {
  for (const page_url of candidatePageUrls(project.project_name, project.city, project.builder_name)) {
    let res: SourceFnResponse | null = null;
    try {
      const r = await fetch(SOURCE_FN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: project.id, page_url }),
      });
      res = (await r.json()) as SourceFnResponse;
    } catch {
      continue;
    }
    if (!res?.ok || !res.url) continue;
    const cls = await classifyImage(res.source_image || res.url);
    if (cls.publishable) {
      return { ok: true, heroUrl: res.url, kind: cls.kind, reason: cls.reason };
    }
  }
  return { ok: false, reason: "no verified rendering found across candidates" };
}

const SKIP_MARKER = "auto-pipeline: no rendering";

/**
 * Floor of the hero ladder: the BUILDER's own website. When the project's
 * pages yield nothing, the builder homepage usually carries a flagship
 * rendering, a lifestyle shot, or at minimum their logo — any of which beats
 * an empty tile. Website comes from the discovery builder registry.
 */
async function builderSiteUrl(
  supabase: ReturnType<typeof createAdminClient>,
  builderName: string | null,
): Promise<string | null> {
  const primary = primaryBuilderName(builderName);
  if (!primary) return null;
  const norm = builderNorm(primary);
  if (!norm) return null;
  const { data } = await supabase
    .from("discovery_builders")
    .select("website")
    .eq("name_norm", norm)
    .not("website", "is", null)
    .maybeSingle();
  if (data?.website) return data.website;
  const { data: fuzzy } = await supabase
    .from("discovery_builders")
    .select("website")
    .ilike("name_norm", `${norm.slice(0, 24)}%`)
    .not("website", "is", null)
    .limit(1);
  return (fuzzy?.[0] as { website: string } | undefined)?.website ?? null;
}

/**
 * The pages we ALREADY KNOW carry this project's imagery: its own website,
 * the web-research source URLs (recorded in import_notes at ingest), and its
 * broker portals. Ordered own-site-first; one page per host.
 */
async function knownPageUrls(
  supabase: ReturnType<typeof createAdminClient>,
  project: { id: string; import_notes: string | null },
  websiteUrl: string | null,
): Promise<string[]> {
  const urls: string[] = [];
  if (websiteUrl) urls.push(websiteUrl);
  for (const m of (project.import_notes ?? "").matchAll(/https?:\/\/[^\s,\])]+/g)) {
    urls.push(m[0]);
  }
  const { data: portals } = await supabase
    .from("project_broker_portals")
    .select("url")
    .eq("project_id", project.id)
    .not("url", "is", null)
    .limit(2);
  for (const p of (portals ?? []) as { url: string }[]) urls.push(p.url);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    try {
      const u = new URL(raw);
      if (/liqwd\.ca|getliqwd\.com/i.test(u.hostname)) continue;
      if (seen.has(u.hostname)) continue;
      seen.add(u.hostname);
      out.push(u.toString());
    } catch {
      /* not a URL */
    }
  }
  return out.slice(0, 3);
}

/**
 * Hero + GALLERY backfill for pages that are live without imagery. Three
 * paths, in order:
 *  1. Known pages — fetch the project's own site / research sources / portals,
 *     download their images, vision-classify (promo creatives excluded), and
 *     attach a gallery + best hero via the ladder (rendering > lifestyle >
 *     project logo). Region-agnostic.
 *  2. Legacy aggregator guesses (gta-homes/condonow/…) — Ontario fallback,
 *     renderings only.
 *  3. Builder's own website (from the discovery builder registry) — flagship
 *     rendering, lifestyle shot, or at minimum the builder's logo.
 * Never touches publish state — the page is live either way.
 */
export async function sourceHeroForMissing(
  projectId?: string,
  limit = 2,
): Promise<SourcingResult[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  const supabase = createAdminClient();

  let q = supabase
    .from("projects")
    .select("id, project_name, city, builder_name, import_notes, website_url")
    .is("hero_image_url", null)
    .not("import_notes", "ilike", `%${SKIP_MARKER}%`)
    .limit(projectId ? 1 : limit);
  q = projectId ? q.eq("id", projectId) : q.eq("record_status", "published");
  const { data } = await q;

  const rows = (data ?? []) as (ProjectRow & {
    import_notes: string | null;
    website_url: string | null;
  })[];
  const results: SourcingResult[] = [];
  for (const p of rows) {
    const stamp = new Date().toISOString().slice(0, 10);

    // Path 1: mine the pages we already know about (any region).
    const pages = await knownPageUrls(supabase, p, p.website_url);
    if (pages.length > 0) {
      try {
        const { images } = await fetchLinkContext(pages);
        if (images.length > 0) {
          await attachGalleryAndHero(supabase, p.id, images, {
            setHero: true,
            projectName: p.project_name,
            city: p.city,
            strictHero: true,
            classifyDeadlineMs: 60_000,
          });
        }
        const { data: after } = await supabase
          .from("projects")
          .select("hero_image_url")
          .eq("id", p.id)
          .maybeSingle();
        if (after?.hero_image_url) {
          await supabase
            .from("projects")
            .update({
              // The ladder may have picked a lifestyle shot or logo, so the
              // alt stays neutral rather than claiming "Rendering of …".
              hero_image_alt: p.project_name,
              import_notes: `${p.import_notes ?? ""} [auto-pipeline ${stamp}: hero + gallery from known pages.]`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", p.id);
          results.push({
            id: p.id,
            name: p.project_name,
            published: true,
            kind: "known_pages",
            reason: `sourced from ${pages.length} known page(s)`,
          });
          continue;
        }
      } catch {
        /* fall through to the aggregator path */
      }
    }

    // Path 2: legacy Ontario aggregator guesses.
    const src = await sourceVerifiedHero(p);
    if (src.ok && src.heroUrl) {
      await supabase
        .from("projects")
        .update({
          hero_image_url: src.heroUrl,
          hero_image_alt: `Rendering of ${p.project_name}`,
          import_notes: `${p.import_notes ?? ""} [auto-pipeline ${stamp}: hero backfilled (${src.kind}).]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      results.push({ id: p.id, name: p.project_name, published: true, kind: src.kind, reason: src.reason });
      continue;
    }

    // Path 3 (floor): the builder's own website — flagship rendering,
    // lifestyle shot, or at minimum their logo, via the same vision ladder.
    const builderPage = await builderSiteUrl(supabase, p.builder_name);
    if (builderPage) {
      try {
        const { images } = await fetchLinkContext([builderPage]);
        if (images.length > 0) {
          await attachGalleryAndHero(supabase, p.id, images, {
            setHero: true,
            projectName: p.project_name,
            city: p.city,
            strictHero: true,
            classifyDeadlineMs: 60_000,
          });
        }
        const { data: after } = await supabase
          .from("projects")
          .select("hero_image_url")
          .eq("id", p.id)
          .maybeSingle();
        if (after?.hero_image_url) {
          await supabase
            .from("projects")
            .update({
              hero_image_alt: p.project_name,
              import_notes: `${p.import_notes ?? ""} [auto-pipeline ${stamp}: hero from builder site (${builderPage}).]`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", p.id);
          results.push({
            id: p.id,
            name: p.project_name,
            published: true,
            kind: "builder_site",
            reason: `sourced from builder site`,
          });
          continue;
        }
      } catch {
        /* fall through to the skip marker */
      }
    }

    await supabase
      .from("projects")
      .update({
        import_notes: `${p.import_notes ?? ""} [${SKIP_MARKER} ${stamp}: ${src.reason}]`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    results.push({ id: p.id, name: p.project_name, published: false, reason: src.reason });
  }
  return results;
}

/**
 * Sources + vision-verifies + publishes up to `limit` draft projects.
 * Safe to run unattended (cron) or on-demand (admin). Returns per-project
 * outcomes.
 */
export async function runHeroSourcingBatch(
  limit = 3,
): Promise<{ processed: number; published: number; results: SourcingResult[] } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "ANTHROPIC_API_KEY is not set." };
  if (!SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "Supabase service-role env is not configured." };
  }

  const supabase = createAdminClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, project_name, city, builder_name, import_notes")
    .eq("record_status", "draft")
    .not("price_from_public", "is", null)
    .not("city", "is", null)
    .not("hero_image_url", "ilike", "%sourced.jpg%")
    .not("import_notes", "ilike", `%${SKIP_MARKER}%`)
    .order("total_units", { ascending: false, nullsFirst: false })
    .limit(limit);

  const rows = (projects ?? []) as (ProjectRow & { import_notes: string | null })[];
  const results: SourcingResult[] = [];
  let published = 0;

  for (const p of rows) {
    const src = await sourceVerifiedHero(p);
    const stamp = new Date().toISOString().slice(0, 10);

    if (!src.ok) {
      await supabase
        .from("projects")
        .update({
          import_notes: `${p.import_notes ?? ""} [${SKIP_MARKER} ${stamp}: ${src.reason}]`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      results.push({ id: p.id, name: p.project_name, published: false, reason: src.reason });
      continue;
    }

    const now = new Date().toISOString();
    await supabase
      .from("projects")
      .update({
        hero_image_url: src.heroUrl,
        hero_image_alt: `Rendering of ${p.project_name}`,
        record_status: "published",
        public_page_enabled: true,
        published_at: now,
        import_notes: `${p.import_notes ?? ""} [auto-pipeline ${stamp}: verified ${src.kind}, published.]`,
        updated_at: now,
      })
      .eq("id", p.id);

    const { data: page } = await supabase
      .from("public_project_pages")
      .select("id")
      .eq("project_id", p.id)
      .maybeSingle();
    if (page) {
      await supabase
        .from("public_project_pages")
        .update({ is_active: true, published_at: now })
        .eq("project_id", p.id);
    } else {
      await supabase
        .from("public_project_pages")
        .insert({ project_id: p.id, slug: slugify(p.project_name), is_active: true, published_at: now });
    }

    // Generate SEO + the four sections (admin client so it works without a session).
    await maybeGenerateSeoOnPublish(p.id, supabase);

    published++;
    results.push({ id: p.id, name: p.project_name, published: true, kind: src.kind, reason: src.reason });
  }

  return { processed: rows.length, published, results };
}
