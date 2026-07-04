import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { InboundImage } from "./extract";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Gallery + smart-hero handling for intake images (email attachments + images
 * pulled from linked landing pages). Every usable image lands in project_media
 * (public gallery); the HERO is chosen by a vision pass — a beautiful exterior
 * rendering beats the wordmark og:image every time.
 */

const VISION_MODEL = "claude-opus-4-8";
const MAX_GALLERY = 6;
/** Default classification wall-clock — the webhook budget is shared. Backfill
 *  callers (no webhook cap) pass a longer deadline via opts. */
const CLASSIFY_DEADLINE_MS = 14_000;

/** Lower = better hero. */
const HERO_RANK: Record<string, number> = {
  exterior_rendering: 0,
  aerial_rendering: 1,
  photo_building: 2,
  interior_rendering: 3,
};
/**
 * Second-tier heroes — used only when nothing in HERO_RANK exists. A page
 * with a real lifestyle/amenity shot (or, at the floor, the project's own
 * logo) still beats the "renderings coming soon" placeholder. Headshots
 * never qualify.
 */
const HERO_RANK_FALLBACK: Record<string, number> = {
  lifestyle_amenity: 0,
  logo_or_text: 1,
};
/** Kinds worth showing in the public gallery (floor plans help buyers). */
const GALLERY_KINDS = new Set([
  ...Object.keys(HERO_RANK),
  "lifestyle_amenity",
  "floor_plan",
  "site_map",
  "unclassified",
]);

/** A grainy upscaled logo must never become a hero — minimum true pixels. */
const HERO_MIN_WIDTH = 700;
const HERO_MIN_HEIGHT = 400;
const GALLERY_MIN_WIDTH = 400;

/**
 * Minimal dimension sniffing for PNG/JPEG/GIF/WebP — no deps. Returns null
 * when the header can't be parsed (treated as unknown, not as a rejection
 * for the gallery; the HERO requires known-good dimensions).
 */
export function imageDims(
  buf: Buffer,
  type: string,
): { w: number; h: number } | null {
  try {
    if (type === "image/png" && buf.length > 24) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
    }
    if (type === "image/gif" && buf.length > 10) {
      return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8) };
    }
    if (type === "image/webp" && buf.length > 30) {
      const cc = buf.subarray(12, 16).toString("latin1");
      if (cc === "VP8X") {
        return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      }
      if (cc === "VP8 ") {
        return {
          w: buf.readUInt16LE(26) & 0x3fff,
          h: buf.readUInt16LE(28) & 0x3fff,
        };
      }
      if (cc === "VP8L") {
        const b = buf.readUInt32LE(21);
        return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
      }
    }
    if (type === "image/jpeg") {
      let off = 2;
      while (off + 9 < buf.length) {
        if (buf[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = buf[off + 1];
        if (marker === 0xff) {
          off++;
          continue;
        }
        const len = buf.readUInt16BE(off + 2);
        if (
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc
        ) {
          return { h: buf.readUInt16BE(off + 5), w: buf.readUInt16BE(off + 7) };
        }
        off += 2 + len;
      }
    }
  } catch {
    /* unparseable header */
  }
  return null;
}

interface Classified {
  img: InboundImage;
  kind: string;
  /** Overlaid offer/marketing text (commission %, bonuses, price banners) —
   *  these are agent-facing creatives and must NEVER reach the public page. */
  promo: boolean;
  dims: { w: number; h: number } | null;
}

async function classifyBase64(
  img: InboundImage,
  context?: { projectName?: string; city?: string | null },
): Promise<{ kind: string; promo: boolean }> {
  try {
    const anthropic = new Anthropic();
    const res = await anthropic.messages.create(
      {
        model: VISION_MODEL,
        max_tokens: 160,
        tools: [
          {
            name: "classify",
            description: "Classify the image.",
            input_schema: {
              type: "object" as const,
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "exterior_rendering",
                    "interior_rendering",
                    "aerial_rendering",
                    "photo_building",
                    "lifestyle_amenity",
                    "floor_plan",
                    "site_map",
                    "logo_or_text",
                    "person_headshot",
                    "vehicle_or_product",
                    "other",
                  ],
                  description:
                    "lifestyle_amenity = amenity/pool/gym/lobby/streetscape/neighbourhood imagery (people incidental); person_headshot = a portrait/agent photo where a person IS the subject; vehicle_or_product = a car, boat, watch, furniture piece or other product IS the subject (brand-partnership sites are full of these — they are NOT property imagery).",
                },
                has_promo_text: {
                  type: "boolean",
                  description:
                    "true if the image has ANY overlaid offer/marketing text — commission percentages, broker/agent incentives, deposit structures, bonus offers, price banners, 'VIP launch' text, etc. A plain project-name watermark does not count.",
                },
              },
              required: ["kind", "has_promo_text"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "classify" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: img.media_type,
                  data: img.data,
                },
              },
              {
                type: "text",
                text:
                  `Classify this candidate image for the new-home project` +
                  (context?.projectName
                    ? ` "${context.projectName}"${context.city ? ` in ${context.city}` : ""}`
                    : "") +
                  `. It must depict the PROPERTY (building, suites, amenities) to be usable — a car, product, or unrelated brand shot is vehicle_or_product/other even if it appears on the project's website. Flag overlaid offer text — commission/incentive creatives are agent-facing and can't be shown to the public.`,
              },
            ],
          },
        ],
      },
      { timeout: 8_000 },
    );
    const block = res.content.find((b) => b.type === "tool_use");
    if (block && block.type === "tool_use") {
      const input = block.input as Record<string, unknown>;
      return {
        kind: String(input.kind ?? "other"),
        promo: Boolean(input.has_promo_text),
      };
    }
    return { kind: "other", promo: false };
  } catch {
    return { kind: "unclassified", promo: false };
  }
}

async function upload(
  admin: Admin,
  projectId: string,
  img: InboundImage,
): Promise<string | null> {
  try {
    const ext = img.media_type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `email-intake/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

/**
 * Uploads intake images to the public gallery and (optionally) sets the best
 * one as the project hero via the ladder (rendering > lifestyle > logo).
 * Never throws; skips headshots + promo creatives; falls back to
 * first-image-as-hero when classification can't finish in budget.
 */
export async function attachGalleryAndHero(
  admin: Admin,
  projectId: string,
  images: InboundImage[],
  opts: {
    setHero: boolean;
    projectName: string;
    city?: string | null;
    /**
     * Strict mode (scraped-page backfills): only a positively-classified
     * image can become the hero — never an unclassified/other leftover.
     * Scraped pages carry unrelated imagery (brand-partnership car shots,
     * ads), so "first image" is not a safe guess there. Email attachments
     * keep the lenient fallback.
     */
    strictHero?: boolean;
    /** Classification wall-clock; backfill callers pass a longer one. */
    classifyDeadlineMs?: number;
  },
): Promise<void> {
  const batch = images.slice(0, MAX_GALLERY);
  if (batch.length === 0) return;

  // Classify within a shared deadline; leftovers stay "unclassified".
  const deadline = opts.classifyDeadlineMs ?? CLASSIFY_DEADLINE_MS;
  const startedAt = Date.now();
  const classified: Classified[] = [];
  for (const img of batch) {
    const dims = imageDims(Buffer.from(img.data, "base64"), img.media_type);
    if (Date.now() - startedAt > deadline) {
      classified.push({ img, kind: "unclassified", promo: false, dims });
      continue;
    }
    const c = await classifyBase64(img, {
      projectName: opts.projectName,
      city: opts.city,
    });
    classified.push({ img, kind: c.kind, promo: c.promo, dims });
  }

  // Resolution gate: only known-good, hero-scale pixels may become the hero
  // (a grainy 300px logo upscaled to a 1200px band is the worst look we have).
  const heroScale = (c: Classified) =>
    c.dims != null && c.dims.w >= HERO_MIN_WIDTH && c.dims.h >= HERO_MIN_HEIGHT;

  // Hero ladder: rendering/photo > lifestyle/amenity > project logo >
  // (lenient mode only) unclassified first image. Headshots and vehicle/
  // product shots never; promo creatives (commission/incentive overlays)
  // never — those are broker-only material.
  let hero: Classified | undefined = classified
    .filter((c) => c.kind in HERO_RANK && !c.promo && heroScale(c))
    .sort((a, b) => HERO_RANK[a.kind] - HERO_RANK[b.kind])[0];
  if (!hero) {
    hero = classified
      .filter((c) => c.kind in HERO_RANK_FALLBACK && !c.promo && heroScale(c))
      .sort(
        (a, b) => HERO_RANK_FALLBACK[a.kind] - HERO_RANK_FALLBACK[b.kind],
      )[0];
  }
  if (!hero && !opts.strictHero) {
    hero = classified.find(
      (c) =>
        (c.kind === "unclassified" || c.kind === "other") &&
        !c.promo &&
        heroScale(c),
    );
  }

  let heroUrl: string | null = null;
  let sort = 0;
  for (const c of classified) {
    const isHero = c === hero;
    // Promo creatives never reach the public gallery at all; in strict mode
    // unclassified scraped images don't either (they're unvetted). Tiny
    // images (thumbnails/logos) stay out of the gallery too.
    const bigEnough = c.dims == null || c.dims.w >= GALLERY_MIN_WIDTH;
    const inGallery =
      !c.promo &&
      bigEnough &&
      ((GALLERY_KINDS.has(c.kind) &&
        !(opts.strictHero && c.kind === "unclassified")) ||
        isHero);
    if (!inGallery) continue;
    const url = await upload(admin, projectId, c.img);
    if (!url) continue;
    if (isHero) heroUrl = url;
    await admin.from("project_media").insert({
      project_id: projectId,
      media_type: c.kind === "unclassified" ? "image" : c.kind,
      url,
      alt_text: `${opts.projectName} — ${c.kind.replace(/_/g, " ")}`,
      sort_order: isHero ? 0 : (c.kind in HERO_RANK ? 1 : 5) + sort,
      is_public: true,
    });
    sort += 1;
  }

  if (opts.setHero && heroUrl) {
    await admin
      .from("projects")
      .update({ hero_image_url: heroUrl })
      .eq("id", projectId);
  }
}
